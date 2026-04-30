from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from hmac import compare_digest

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth_user import AuthUser
from app.models.otp_verification import OTPVerification
from app.repositories.auth_repository import AuthUserRepository
from app.repositories.otp_repository import OTPVerificationRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.auth import (
    AuthMessageResponse,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyOTPRequest,
)
from app.services.activity_service import ActivityService
from app.services.email_service import EmailService


class DuplicateEmailError(Exception):
    def __init__(self, email: str) -> None:
        self.email = email
        super().__init__(f"User with email {email} already exists")


class InvalidAdminRegistrationKeyError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AuthUserNotFoundError(Exception):
    def __init__(self, user_id: int) -> None:
        self.user_id = user_id
        super().__init__(f"Auth user with id {user_id} was not found")


class OTPRateLimitError(Exception):
    pass


class OTPInvalidError(Exception):
    pass


class OTPExpiredError(Exception):
    pass


class OTPUsedError(Exception):
    pass


class AuthService:
    def __init__(
        self,
        auth_user_repository: AuthUserRepository,
        otp_repository: OTPVerificationRepository,
        email_service: EmailService,
        activity_service: ActivityService | None = None,
        profile_repository: ProfileRepository | None = None,
    ) -> None:
        self.auth_user_repository = auth_user_repository
        self.otp_repository = otp_repository
        self.email_service = email_service
        self.activity_service = activity_service
        self.profile_repository = profile_repository

    def register(self, register_data: RegisterRequest) -> AuthMessageResponse:
        email = register_data.email.strip().lower()
        if self.auth_user_repository.get_by_email(email) is not None:
            raise DuplicateEmailError(email)

        role = register_data.role or "user"
        if role == "admin":
            self._validate_admin_registration_key(
                register_data.admin_registration_key,
            )

        self.email_service.ensure_configured()

        user = self.auth_user_repository.create(
            {
                "age": register_data.age,
                "email": email,
                "experience_level": register_data.experience_level,
                "fitness_goal": register_data.fitness_goal,
                "height_cm": register_data.height_cm,
                "is_verified": False,
                "name": register_data.name.strip(),
                "password_hash": hash_password(register_data.password),
                "role": role,
                "weight_kg": register_data.weight_kg,
            },
        )
        if role == "user":
            self._ensure_default_profile(user)
        otp = self._issue_otp(email=email, purpose="register")
        return AuthMessageResponse(
            message="Registration successful. OTP has been sent to your email.",
            email=email,
            dev_otp=self._dev_otp(otp),
        )

    def login(self, login_data: LoginRequest) -> LoginResponse:
        user = self.auth_user_repository.get_by_email(login_data.email)
        if user is None or not verify_password(
            login_data.password,
            user.password_hash,
        ):
            raise InvalidCredentialsError()

        if not user.is_verified:
            otp = self._issue_otp(
                email=user.email,
                purpose="register",
                reuse_recent=True,
            )
            return LoginResponse(
                requires_verification=True,
                message="Please verify your email. A new OTP has been sent.",
                email=user.email,
                dev_otp=self._dev_otp(otp),
            )

        return self._login_response(user)

    def verify_otp(self, verify_data: VerifyOTPRequest) -> TokenResponse:
        user = self.auth_user_repository.get_by_email(verify_data.email)
        if user is None:
            raise OTPInvalidError()

        self._validate_and_use_otp(
            email=verify_data.email,
            otp_code=verify_data.otp_code,
            purpose=verify_data.purpose,
        )

        if verify_data.purpose == "register" and not user.is_verified:
            user = self.auth_user_repository.update(user, {"is_verified": True})

        self._record_login_activity(user)
        return self._token_response(user)

    def resend_otp(self, email: str, purpose: str) -> AuthMessageResponse:
        if purpose == "register" and self.auth_user_repository.get_by_email(email) is None:
            raise OTPInvalidError()

        otp = self._issue_otp(email=email, purpose=purpose)
        return AuthMessageResponse(
            message="A new OTP has been sent to your email.",
            email=email,
            dev_otp=self._dev_otp(otp),
        )

    def forgot_password(self, email: str) -> AuthMessageResponse:
        user = self.auth_user_repository.get_by_email(email)
        if user is None:
            return AuthMessageResponse(
                message="If this email is registered, a password reset OTP has been sent.",
                email=email,
            )

        otp = self._issue_otp(email=email, purpose="forgot_password")
        return AuthMessageResponse(
            message="If this email is registered, a password reset OTP has been sent.",
            email=email,
            dev_otp=self._dev_otp(otp),
        )

    def reset_password(self, reset_data: ResetPasswordRequest) -> AuthMessageResponse:
        user = self.auth_user_repository.get_by_email(reset_data.email)
        if user is None:
            raise OTPInvalidError()

        self._validate_and_use_otp(
            email=reset_data.email,
            otp_code=reset_data.otp_code,
            purpose="forgot_password",
        )
        self.auth_user_repository.update(
            user,
            {
                "password_hash": hash_password(reset_data.new_password),
            },
        )
        return AuthMessageResponse(
            message="Password reset successful. You can log in now.",
            email=reset_data.email,
        )

    def get_user(self, user_id: int) -> AuthUser:
        user = self.auth_user_repository.get_by_id(user_id)
        if user is None:
            raise AuthUserNotFoundError(user_id)
        return user

    def _issue_otp(
        self,
        *,
        email: str,
        purpose: str,
        reuse_recent: bool = False,
    ) -> OTPVerification:
        normalized_email = email.strip().lower()
        settings = get_settings()
        now = datetime.utcnow()
        latest_unused = self.otp_repository.get_latest_unused(
            normalized_email,
            purpose,
        )

        if latest_unused is not None:
            seconds_since_latest = (
                now - self._naive_datetime(latest_unused.created_at)
            ).total_seconds()
            if seconds_since_latest < 60:
                if reuse_recent:
                    self.email_service.send_otp(
                        email=normalized_email,
                        otp_code=latest_unused.otp_code,
                        purpose=purpose,
                    )
                    return latest_unused
                raise OTPRateLimitError()

        otp_code = f"{secrets.randbelow(1_000_000):06d}"
        self.otp_repository.mark_unused_used(normalized_email, purpose)
        otp = self.otp_repository.create(
            email=normalized_email,
            expires_at=now + timedelta(minutes=settings.otp_expire_minutes),
            otp_code=otp_code,
            purpose=purpose,
        )
        self.email_service.send_otp(
            email=normalized_email,
            otp_code=otp_code,
            purpose=purpose,
        )
        return otp

    def _validate_and_use_otp(
        self,
        *,
        email: str,
        otp_code: str,
        purpose: str,
    ) -> OTPVerification:
        latest = self.otp_repository.get_latest(email, purpose)
        if latest is None:
            raise OTPInvalidError()
        if latest.is_used:
            raise OTPUsedError()
        if self._naive_datetime(latest.expires_at) <= datetime.utcnow():
            raise OTPExpiredError()
        if not compare_digest(latest.otp_code, otp_code):
            raise OTPInvalidError()

        return self.otp_repository.mark_used(latest)

    def _token_response(self, user: AuthUser) -> TokenResponse:
        token = create_access_token(
            subject=str(user.id),
            claims={
                "email": user.email,
                "role": user.role,
            },
        )
        return TokenResponse(access_token=token, user=user)

    def _login_response(self, user: AuthUser) -> LoginResponse:
        self._record_login_activity(user)
        token_response = self._token_response(user)
        return LoginResponse(
            access_token=token_response.access_token,
            token_type=token_response.token_type,
            user=token_response.user,
        )

    def _record_login_activity(self, user: AuthUser) -> None:
        if self.activity_service is not None:
            self.activity_service.record_login(user.id)

    def _validate_admin_registration_key(self, provided_key: str | None) -> None:
        expected_key = (get_settings().admin_registration_key or "").strip()
        provided = (provided_key or "").strip()
        if not expected_key or not compare_digest(provided, expected_key):
            raise InvalidAdminRegistrationKeyError()

    def _ensure_default_profile(self, user: AuthUser) -> None:
        if self.profile_repository is None:
            return

        self.profile_repository.create_default_for_auth_user(
            profile_id=user.id,
            name=user.name,
            age=user.age,
            height_cm=user.height_cm,
            weight_kg=user.weight_kg,
            fitness_goal=user.fitness_goal,
            experience_level=user.experience_level,
        )

    def _dev_otp(self, otp: OTPVerification) -> str | None:
        return otp.otp_code if get_settings().dev_mode else None

    def _naive_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value
        return value.replace(tzinfo=None)
