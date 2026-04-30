from collections.abc import Generator
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.db.base import Base, create_all_tables
from app.db.seeds import seed_auth_users, seed_subscription_plans
from app.db.session import get_db
from app.main import app
from app.models.otp_verification import OTPVerification
from app.repositories.auth_repository import AuthUserRepository
from app.services.email_service import EmailService


@pytest.fixture()
def client(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> Generator[TestClient, None, None]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )

    sent_emails: list[dict[str, str]] = []
    settings = get_settings()
    original_admin_email = settings.admin_email
    original_admin_force_reset = settings.admin_force_reset
    original_admin_password = settings.admin_password
    original_admin_registration_key = settings.admin_registration_key
    original_dev_mode = settings.dev_mode
    original_upload_dir = settings.upload_dir
    settings.admin_email = "owner.admin@example.com"
    settings.admin_force_reset = True
    settings.admin_password = "Admin@123"
    settings.admin_registration_key = "test-admin-key"
    settings.dev_mode = True
    settings.upload_dir = tmp_path / "uploads"

    def fake_send_otp(
        self: EmailService,
        *,
        email: str,
        otp_code: str,
        purpose: str,
    ) -> None:
        sent_emails.append(
            {
                "email": email,
                "otp_code": otp_code,
                "purpose": purpose,
            },
        )

    monkeypatch.setattr(EmailService, "send_otp", fake_send_otp)

    create_all_tables(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_auth_users(db)
        seed_subscription_plans(db)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        setattr(test_client, "_testing_session_local", TestingSessionLocal)
        setattr(test_client, "_sent_emails", sent_emails)
        yield test_client

    settings.admin_email = original_admin_email
    settings.admin_force_reset = original_admin_force_reset
    settings.admin_password = original_admin_password
    settings.admin_registration_key = original_admin_registration_key
    settings.upload_dir = original_upload_dir
    settings.dev_mode = original_dev_mode
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def register_payload(email: str = "new.user@example.com") -> dict[str, object]:
    return {
        "email": email,
        "name": "New User",
        "password": "Strong@123",
    }


def video_payload() -> dict[str, object]:
    return {
        "category": "Strength",
        "description": "A simple demo movement.",
        "difficulty": "beginner",
        "duration_minutes": 8,
        "equipment": "Bodyweight",
        "is_active": True,
        "is_premium": False,
        "target_muscles": ["Core"],
        "thumbnail_url": "",
        "title": "Demo Movement",
        "video_url": "https://example.com/video.mp4",
    }


def login_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def latest_otp(client: TestClient, email: str, purpose: str) -> OTPVerification:
    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        statement = (
            select(OTPVerification)
            .where(
                OTPVerification.email == email,
                OTPVerification.purpose == purpose,
            )
            .order_by(OTPVerification.created_at.desc(), OTPVerification.id.desc())
        )
        otp = db.scalars(statement).first()
        assert otp is not None
        return otp


def sent_emails(client: TestClient) -> list[dict[str, str]]:
    return getattr(client, "_sent_emails")


def update_latest_otp(
    client: TestClient,
    email: str,
    purpose: str,
    update_data: dict[str, Any],
) -> None:
    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        statement = (
            select(OTPVerification)
            .where(
                OTPVerification.email == email,
                OTPVerification.purpose == purpose,
            )
            .order_by(OTPVerification.created_at.desc(), OTPVerification.id.desc())
        )
        otp = db.scalars(statement).first()
        assert otp is not None
        for field, value in update_data.items():
            setattr(otp, field, value)
        db.add(otp)
        db.commit()


def test_register_creates_unverified_user_and_otp(client: TestClient) -> None:
    response = client.post("/api/v1/auth/register", json=register_payload())

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new.user@example.com"
    assert data["message"] == "Registration successful. OTP has been sent to your email."
    assert len(data["dev_otp"]) == 6
    assert sent_emails(client)[-1] == {
        "email": "new.user@example.com",
        "otp_code": data["dev_otp"],
        "purpose": "register",
    }
    otp = latest_otp(client, "new.user@example.com", "register")
    assert otp.is_used is False
    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        user = AuthUserRepository(db).get_by_email("new.user@example.com")
        assert user is not None
        assert user.role == "user"
        assert user.is_verified is False


def test_register_user_role_payload_creates_user_account(client: TestClient) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={**register_payload("role.user@example.com"), "role": "user"},
    )
    otp = register_response.json()["dev_otp"]

    verify_response = client.post(
        "/api/v1/auth/verify-otp",
        json={
            "email": "role.user@example.com",
            "otp_code": otp,
            "purpose": "register",
        },
    )

    assert register_response.status_code == 201
    assert verify_response.status_code == 200
    assert verify_response.json()["user"]["role"] == "user"


def test_register_admin_without_key_fails(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={**register_payload("admin.missing@example.com"), "role": "admin"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid admin registration key."


def test_register_admin_with_wrong_key_fails(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            **register_payload("admin.wrong@example.com"),
            "admin_registration_key": "wrong-key",
            "role": "admin",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid admin registration key."


def test_register_admin_with_correct_key_creates_admin_account(
    client: TestClient,
) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            **register_payload("registered.admin@example.com"),
            "admin_registration_key": "test-admin-key",
            "role": "admin",
        },
    )
    otp = register_response.json()["dev_otp"]
    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        user = AuthUserRepository(db).get_by_email("registered.admin@example.com")
        assert user is not None
        assert user.role == "admin"
        assert user.is_verified is False

    verify_response = client.post(
        "/api/v1/auth/verify-otp",
        json={
            "email": "registered.admin@example.com",
            "otp_code": otp,
            "purpose": "register",
        },
    )

    assert register_response.status_code == 201
    assert sent_emails(client)[-1] == {
        "email": "registered.admin@example.com",
        "otp_code": otp,
        "purpose": "register",
    }
    assert verify_response.status_code == 200
    assert verify_response.json()["user"]["role"] == "admin"


def test_verify_otp_verifies_user(client: TestClient) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json=register_payload("verify@example.com"),
    )
    otp = register_response.json()["dev_otp"]

    response = client.post(
        "/api/v1/auth/verify-otp",
        json={
            "email": "verify@example.com",
            "otp_code": otp,
            "purpose": "register",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "verify@example.com"
    assert data["user"]["role"] == "user"
    assert data["user"]["is_verified"] is True


def test_login_verified_user_works(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@fitcoach.local", "password": "User@123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "user"
    assert data["user"]["is_verified"] is True
    assert "access_token" in data


def test_login_demo_admin_success(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fitcoach.local", "password": "Admin@123"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_login_unverified_user_requires_otp(client: TestClient) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json=register_payload("pending@example.com"),
    )
    email_count_after_register = len(sent_emails(client))

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "pending@example.com", "password": "Strong@123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["requires_verification"] is True
    assert data["email"] == "pending@example.com"
    assert data["message"] == "Please verify your email. A new OTP has been sent."
    assert data["dev_otp"] == register_response.json()["dev_otp"]
    assert len(sent_emails(client)) == email_count_after_register + 1
    assert sent_emails(client)[-1]["email"] == "pending@example.com"


def test_login_wrong_password_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@fitcoach.local", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_resend_otp_works(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=register_payload("resend@example.com"))
    update_latest_otp(
        client,
        "resend@example.com",
        "register",
        {"created_at": datetime.utcnow() - timedelta(seconds=90)},
    )

    response = client.post(
        "/api/v1/auth/resend-otp",
        json={"email": "resend@example.com", "purpose": "register"},
    )

    assert response.status_code == 200
    assert len(response.json()["dev_otp"]) == 6
    assert sent_emails(client)[-1]["email"] == "resend@example.com"
    assert sent_emails(client)[-1]["purpose"] == "register"


def test_resend_otp_rate_limit_works(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=register_payload("limited@example.com"))

    response = client.post(
        "/api/v1/auth/resend-otp",
        json={"email": "limited@example.com", "purpose": "register"},
    )

    assert response.status_code == 429
    assert response.json()["detail"] == "Please wait before requesting another OTP"


def test_forgot_password_otp_works(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "user@fitcoach.local"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@fitcoach.local"
    assert len(data["dev_otp"]) == 6
    assert sent_emails(client)[-1] == {
        "email": "user@fitcoach.local",
        "otp_code": data["dev_otp"],
        "purpose": "forgot_password",
    }


def test_reset_password_works(client: TestClient) -> None:
    forgot_response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "user@fitcoach.local"},
    )
    otp = forgot_response.json()["dev_otp"]

    reset_response = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": "user@fitcoach.local",
            "new_password": "NewUser@123",
            "otp_code": otp,
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@fitcoach.local", "password": "NewUser@123"},
    )

    assert reset_response.status_code == 200
    assert login_response.status_code == 200


def test_auth_me_works_with_token(client: TestClient) -> None:
    headers = login_headers(client, "user@fitcoach.local", "User@123")

    response = client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "user@fitcoach.local"


def test_admin_route_rejects_user_token(client: TestClient) -> None:
    headers = login_headers(client, "user@fitcoach.local", "User@123")

    response = client.post(
        "/api/v1/admin/videos",
        headers=headers,
        json=video_payload(),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


def test_admin_route_accepts_admin_token(client: TestClient) -> None:
    headers = login_headers(client, "admin@fitcoach.local", "Admin@123")

    response = client.post(
        "/api/v1/admin/videos",
        headers=headers,
        json=video_payload(),
    )

    assert response.status_code == 201
    assert response.json()["title"] == "Demo Movement"


def test_environment_admin_seed_exists(client: TestClient) -> None:
    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        user = AuthUserRepository(db).get_by_email("owner.admin@example.com")
        assert user is not None
        assert user.role == "admin"
        assert user.is_verified is True

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner.admin@example.com", "password": "Admin@123"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_environment_admin_password_resets_when_forced(
    client: TestClient,
) -> None:
    settings = get_settings()
    settings.admin_email = "stale.admin@example.com"
    settings.admin_password = "FreshAdmin@123"
    settings.admin_force_reset = True

    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        repository = AuthUserRepository(db)
        repository.create(
            {
                "email": "stale.admin@example.com",
                "is_verified": False,
                "name": "Stale Admin",
                "password_hash": hash_password("OldAdmin@123"),
                "role": "user",
            },
        )
        seed_auth_users(db)
        user = repository.get_by_email("stale.admin@example.com")
        assert user is not None
        assert user.role == "admin"
        assert user.is_verified is True
        assert verify_password("FreshAdmin@123", user.password_hash)

    old_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "stale.admin@example.com", "password": "OldAdmin@123"},
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "stale.admin@example.com", "password": "FreshAdmin@123"},
    )

    assert old_login_response.status_code == 401
    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "admin"


def test_environment_admin_does_not_reset_password_without_force(
    client: TestClient,
) -> None:
    settings = get_settings()
    settings.admin_email = "keep.password@example.com"
    settings.admin_password = "IgnoredAdmin@123"
    settings.admin_force_reset = False

    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        repository = AuthUserRepository(db)
        repository.create(
            {
                "email": "keep.password@example.com",
                "is_verified": False,
                "name": "Existing Admin",
                "password_hash": hash_password("KeepAdmin@123"),
                "role": "user",
            },
        )
        seed_auth_users(db)
        user = repository.get_by_email("keep.password@example.com")
        assert user is not None
        assert user.role == "admin"
        assert user.is_verified is True
        assert verify_password("KeepAdmin@123", user.password_hash)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "keep.password@example.com", "password": "KeepAdmin@123"},
    )
    ignored_password_response = client.post(
        "/api/v1/auth/login",
        json={"email": "keep.password@example.com", "password": "IgnoredAdmin@123"},
    )

    assert login_response.status_code == 200
    assert ignored_password_response.status_code == 401


def test_environment_admin_seed_does_not_change_normal_users(
    client: TestClient,
) -> None:
    settings = get_settings()
    settings.admin_email = "seeded.admin@example.com"
    settings.admin_password = "SeedAdmin@123"
    settings.admin_force_reset = True

    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        repository = AuthUserRepository(db)
        normal_user = repository.create(
            {
                "email": "normal.keep@example.com",
                "is_verified": False,
                "name": "Normal User",
                "password_hash": hash_password("Normal@123"),
                "role": "user",
            },
        )
        seed_auth_users(db)
        unchanged_user = repository.get_by_email("normal.keep@example.com")
        admin_user = repository.get_by_email("seeded.admin@example.com")

        assert unchanged_user is not None
        assert unchanged_user.id == normal_user.id
        assert unchanged_user.role == "user"
        assert unchanged_user.is_verified is False
        assert verify_password("Normal@123", unchanged_user.password_hash)
        assert admin_user is not None
        assert admin_user.role == "admin"


def test_duplicate_email_rejected(client: TestClient) -> None:
    payload = register_payload("duplicate@example.com")
    first_response = client.post("/api/v1/auth/register", json=payload)
    second_response = client.post("/api/v1/auth/register", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert (
        second_response.json()["detail"]
        == "This email is already registered. Please login instead."
    )


def test_expired_otp_rejected(client: TestClient) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json=register_payload("expired@example.com"),
    )
    otp = register_response.json()["dev_otp"]
    update_latest_otp(
        client,
        "expired@example.com",
        "register",
        {"expires_at": datetime.utcnow() - timedelta(minutes=1)},
    )

    response = client.post(
        "/api/v1/auth/verify-otp",
        json={
            "email": "expired@example.com",
            "otp_code": otp,
            "purpose": "register",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "OTP expired. Please request a new OTP."


def test_reused_otp_rejected(client: TestClient) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json=register_payload("reused@example.com"),
    )
    otp = register_response.json()["dev_otp"]
    payload = {
        "email": "reused@example.com",
        "otp_code": otp,
        "purpose": "register",
    }

    first_response = client.post("/api/v1/auth/verify-otp", json=payload)
    second_response = client.post("/api/v1/auth/verify-otp", json=payload)

    assert first_response.status_code == 200
    assert second_response.status_code == 400
    assert second_response.json()["detail"] == "OTP already used. Please request a new OTP."
