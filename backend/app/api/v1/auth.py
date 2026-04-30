from hmac import compare_digest
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import InvalidTokenError, decode_access_token
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.repositories.activity_repository import ActivityRepository
from app.repositories.auth_repository import AuthUserRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository
from app.repositories.otp_repository import OTPVerificationRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.auth import (
    AuthMessageResponse,
    AuthUserRead,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    OTPRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyOTPRequest,
)
from app.services.auth_service import (
    AuthService,
    AuthUserNotFoundError,
    DuplicateEmailError,
    InvalidAdminRegistrationKeyError,
    InvalidCredentialsError,
    OTPExpiredError,
    OTPInvalidError,
    OTPRateLimitError,
    OTPUsedError,
)
from app.services.activity_service import ActivityService
from app.services.email_service import (
    EmailDeliveryError,
    EmailService,
    EmailServiceNotConfiguredError,
)

router = APIRouter(tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(
        activity_service=ActivityService(
            ActivityRepository(db),
            MongoActivityRepository(),
        ),
        auth_user_repository=AuthUserRepository(db),
        otp_repository=OTPVerificationRepository(db),
        email_service=EmailService(),
        profile_repository=ProfileRepository(db),
    )


def raise_unauthorized(detail: str = "Invalid or missing access token") -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_user_from_credentials(
    credentials: HTTPAuthorizationCredentials,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthUser:
    try:
        payload = decode_access_token(credentials.credentials)
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise InvalidTokenError("Token subject missing")
        return auth_service.get_user(int(subject))
    except (InvalidTokenError, ValueError, AuthUserNotFoundError):
        raise_unauthorized()


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise_unauthorized()

    return get_user_from_credentials(credentials, auth_service)


def get_optional_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthUser | None:
    if credentials is None:
        return None
    if credentials.scheme.lower() != "bearer":
        raise_unauthorized()

    return get_user_from_credentials(credentials, auth_service)


def require_admin_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    x_admin_key: Annotated[str | None, Header(alias="X-ADMIN-KEY")] = None,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthUser | None:
    expected_admin_key = get_settings().admin_api_key
    if x_admin_key and compare_digest(x_admin_key, expected_admin_key):
        return None

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise_unauthorized()

    current_user = get_user_from_credentials(credentials, auth_service)
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def raise_otp_error(error: Exception) -> NoReturn:
    if isinstance(error, OTPRateLimitError):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another OTP",
        )
    if isinstance(error, OTPExpiredError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired. Please request a new OTP.",
        )
    if isinstance(error, OTPUsedError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP already used. Please request a new OTP.",
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid OTP",
    )


def raise_email_error(error: Exception) -> NoReturn:
    if isinstance(error, EmailServiceNotConfiguredError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured.",
        )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not send OTP email. Please try again later.",
    )


@router.post(
    "/register",
    response_model=AuthMessageResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
def register(
    register_data: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthMessageResponse:
    try:
        return auth_service.register(register_data)
    except DuplicateEmailError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered. Please login instead.",
        )
    except InvalidAdminRegistrationKeyError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin registration key.",
        )
    except OTPRateLimitError as error:
        raise_otp_error(error)
    except (EmailServiceNotConfiguredError, EmailDeliveryError) as error:
        raise_email_error(error)


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(
    verify_data: VerifyOTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        return auth_service.verify_otp(verify_data)
    except (OTPInvalidError, OTPExpiredError, OTPUsedError) as error:
        raise_otp_error(error)


@router.post(
    "/resend-otp",
    response_model=AuthMessageResponse,
    response_model_exclude_none=True,
)
def resend_otp(
    otp_data: OTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthMessageResponse:
    try:
        return auth_service.resend_otp(otp_data.email, otp_data.purpose)
    except (OTPRateLimitError, OTPInvalidError) as error:
        raise_otp_error(error)
    except (EmailServiceNotConfiguredError, EmailDeliveryError) as error:
        raise_email_error(error)


@router.post(
    "/login",
    response_model=LoginResponse,
    response_model_exclude_none=True,
)
def login(
    login_data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    try:
        return auth_service.login(login_data)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except OTPRateLimitError as error:
        raise_otp_error(error)
    except (EmailServiceNotConfiguredError, EmailDeliveryError) as error:
        raise_email_error(error)


@router.post(
    "/forgot-password",
    response_model=AuthMessageResponse,
    response_model_exclude_none=True,
)
def forgot_password(
    forgot_data: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthMessageResponse:
    try:
        return auth_service.forgot_password(forgot_data.email)
    except OTPRateLimitError as error:
        raise_otp_error(error)
    except (EmailServiceNotConfiguredError, EmailDeliveryError) as error:
        raise_email_error(error)


@router.post(
    "/reset-password",
    response_model=AuthMessageResponse,
    response_model_exclude_none=True,
)
def reset_password(
    reset_data: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthMessageResponse:
    try:
        return auth_service.reset_password(reset_data)
    except (OTPInvalidError, OTPExpiredError, OTPUsedError) as error:
        raise_otp_error(error)


@router.get("/me", response_model=AuthUserRead)
def me(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    return current_user
