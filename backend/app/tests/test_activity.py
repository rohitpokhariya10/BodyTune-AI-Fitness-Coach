from collections.abc import Generator
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine

from app.core.config import get_settings
from app.db.base import Base, create_all_tables
from app.db.seeds import seed_auth_users, seed_food_items, seed_subscription_plans
from app.db.session import get_db
from app.main import app
from app.models.activity_log import ActivityLog
from app.models.auth_user import AuthUser
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

    settings = get_settings()
    original_admin_email = settings.admin_email
    original_dev_mode = settings.dev_mode
    original_upload_dir = settings.upload_dir
    settings.admin_email = "owner.admin@example.com"
    settings.dev_mode = True
    settings.upload_dir = tmp_path / "uploads"

    def fake_send_otp(
        self: EmailService,
        *,
        email: str,
        otp_code: str,
        purpose: str,
    ) -> None:
        _ = self, email, otp_code, purpose

    monkeypatch.setattr(EmailService, "send_otp", fake_send_otp)

    create_all_tables(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_auth_users(db)
        seed_food_items(db)
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
        yield test_client

    settings.admin_email = original_admin_email
    settings.dev_mode = original_dev_mode
    settings.upload_dir = original_upload_dir
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def session_local(client: TestClient) -> sessionmaker[Session]:
    return getattr(client, "_testing_session_local")


def login_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@fitcoach.local", "password": "User@123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def valid_profile_payload(name: str = "Rohit") -> dict[str, object]:
    return {
        "age": 24,
        "experience_level": "beginner",
        "fitness_goal": "strength",
        "height_cm": 175.0,
        "name": name,
        "weight_kg": 72.0,
    }


def create_profile(client: TestClient) -> int:
    response = client.post("/api/v1/profiles", json=valid_profile_payload())
    assert response.status_code == 201
    return int(response.json()["id"])


def get_food_id(client: TestClient, name: str) -> int:
    response = client.get("/api/v1/foods/search", params={"q": name})
    assert response.status_code == 200
    matches = response.json()
    assert matches
    return int(matches[0]["id"])


def activity_logs(client: TestClient, user_id: int = 1) -> list[ActivityLog]:
    with session_local(client)() as db:
        statement = (
            select(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .order_by(ActivityLog.activity_date, ActivityLog.id)
        )
        return list(db.scalars(statement).all())


def clear_activity(client: TestClient) -> None:
    with session_local(client)() as db:
        for activity_log in db.scalars(select(ActivityLog)).all():
            db.delete(activity_log)
        db.commit()


def seed_activity_log(
    client: TestClient,
    *,
    activity_date: date,
    count: int = 1,
    user_id: int = 1,
) -> None:
    with session_local(client)() as db:
        db.add(
            ActivityLog(
                activity_count=count,
                activity_date=activity_date,
                diet_log_count=0,
                last_activity_at=datetime.utcnow(),
                login_count=0,
                subscription_action_count=0,
                user_id=user_id,
                video_watch_count=0,
                workout_count=0,
            ),
        )
        db.commit()


def test_login_creates_activity_record(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@fitcoach.local", "password": "User@123"},
    )

    assert response.status_code == 200
    logs = activity_logs(client)
    assert len(logs) == 1
    assert logs[0].activity_date == date.today()
    assert logs[0].activity_count == 1
    assert logs[0].login_count == 1


def test_same_day_login_increments_without_duplicate_row(client: TestClient) -> None:
    login_headers(client)
    login_headers(client)

    logs = activity_logs(client)
    assert len(logs) == 1
    assert logs[0].activity_count == 2
    assert logs[0].login_count == 2


def test_otp_verification_records_login_activity(client: TestClient) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "activity.verify@example.com",
            "name": "Activity User",
            "password": "Strong@123",
        },
    )
    assert register_response.status_code == 201

    verify_response = client.post(
        "/api/v1/auth/verify-otp",
        json={
            "email": "activity.verify@example.com",
            "otp_code": register_response.json()["dev_otp"],
            "purpose": "register",
        },
    )

    assert verify_response.status_code == 200
    user_id = verify_response.json()["user"]["id"]
    logs = activity_logs(client, user_id=user_id)
    assert len(logs) == 1
    assert logs[0].activity_count == 1
    assert logs[0].login_count == 1


def test_diet_log_increments_diet_activity(client: TestClient) -> None:
    headers = login_headers(client)
    clear_activity(client)
    user_id = create_profile(client)
    banana_id = get_food_id(client, "banana")

    response = client.post(
        "/api/v1/diet/logs",
        headers=headers,
        json={
            "food_item_id": banana_id,
            "meal_type": "snack",
            "quantity": 1,
            "user_id": user_id,
        },
    )

    assert response.status_code == 201
    logs = activity_logs(client)
    assert len(logs) == 1
    assert logs[0].activity_count == 1
    assert logs[0].diet_log_count == 1


def test_workout_save_increments_workout_activity(client: TestClient) -> None:
    headers = login_headers(client)
    clear_activity(client)
    user_id = create_profile(client)

    response = client.post(
        "/api/v1/results",
        headers=headers,
        json={
            "correct_reps": 8,
            "duration_seconds": 90,
            "feedback_tags": ["back_alignment"],
            "incorrect_reps": 2,
            "primary_feedback": "Keep your back steady.",
            "total_reps": 10,
            "user_id": user_id,
            "workout_type": "squat",
        },
    )

    assert response.status_code == 201
    logs = activity_logs(client)
    assert len(logs) == 1
    assert logs[0].activity_count == 1
    assert logs[0].workout_count == 1


def test_heatmap_returns_expected_levels(client: TestClient) -> None:
    headers = login_headers(client)
    clear_activity(client)
    today = date.today()
    seed_activity_log(client, activity_date=today - timedelta(days=3), count=1)
    seed_activity_log(client, activity_date=today - timedelta(days=2), count=3)
    seed_activity_log(client, activity_date=today - timedelta(days=1), count=4)
    seed_activity_log(client, activity_date=today, count=7)

    response = client.get("/api/v1/activity/heatmap?days=5", headers=headers)

    assert response.status_code == 200
    days = response.json()["days"]
    assert [day["level"] for day in days] == [0, 1, 2, 3, 4]
    assert [day["count"] for day in days] == [0, 1, 3, 4, 7]


def test_current_and_longest_streak_calculation(client: TestClient) -> None:
    headers = login_headers(client)
    clear_activity(client)
    today = date.today()
    for offset in [9, 8, 7, 6]:
        seed_activity_log(client, activity_date=today - timedelta(days=offset))
    for offset in [1, 0]:
        seed_activity_log(client, activity_date=today - timedelta(days=offset))

    response = client.get("/api/v1/activity/summary", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["current_streak"] == 2
    assert data["longest_streak"] == 4
    assert data["total_active_days"] == 6
    assert data["today_activity_count"] == 1


def test_activity_summary_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/activity/summary")

    assert response.status_code == 401


def test_activity_record_without_token_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/v1/activity/record",
        json={"activity_type": "general"},
    )

    assert response.status_code == 401
