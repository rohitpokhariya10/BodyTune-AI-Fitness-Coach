from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base, create_all_tables
from app.db.seeds import seed_auth_users, seed_food_items, seed_subscription_plans
from app.db.session import get_db
from app.main import app
from app.repositories.auth_repository import AuthUserRepository


@pytest.fixture()
def client(tmp_path: Path) -> Generator[TestClient, None, None]:
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
    settings.admin_email = ""
    settings.dev_mode = True
    settings.upload_dir = tmp_path / "uploads"

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


def login_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def user_headers(client: TestClient) -> dict[str, str]:
    return login_headers(client, "user@fitcoach.local", "User@123")


def admin_headers(client: TestClient) -> dict[str, str]:
    return login_headers(client, "admin@fitcoach.local", "Admin@123")


def create_token_for_new_user(client: TestClient) -> dict[str, str]:
    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        user = AuthUserRepository(db).create(
            {
                "age": None,
                "email": "fresh@example.com",
                "experience_level": None,
                "fitness_goal": None,
                "height_cm": None,
                "is_verified": True,
                "name": "Fresh User",
                "password_hash": hash_password("Fresh@123"),
                "role": "user",
                "weight_kg": None,
            },
        )
        user_id = user.id
        user_email = user.email
        user_role = user.role

    token = create_access_token(
        subject=str(user_id),
        claims={"email": user_email, "role": user_role},
    )
    return {"Authorization": f"Bearer {token}"}


def get_food_id(client: TestClient, name: str) -> int:
    response = client.get("/api/v1/foods/search", params={"q": name})
    assert response.status_code == 200
    return int(response.json()[0]["id"])


def test_dashboard_summary_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 401


def test_new_user_dashboard_returns_zero_data(client: TestClient) -> None:
    response = client.get(
        "/api/v1/dashboard/summary",
        headers=create_token_for_new_user(client),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["nutrition"]["total_calories"] == 0
    assert data["nutrition"]["calorie_goal"] is None
    assert data["nutrition"]["calories_remaining"] is None
    assert data["nutrition"]["goal_is_set"] is False
    assert data["nutrition"]["meals_logged_today"] == 0
    assert data["workouts"]["total_sessions"] == 0
    assert data["workouts"]["average_form_score"] == 0
    assert data["activity"]["current_streak"] == 0
    assert data["activity"]["today_activity_count"] == 0
    assert data["subscription"]["status"] == "inactive"
    assert data["subscription"]["plan"]["name"] == "Free"
    assert data["insight"]["title"] == "Start your first session"


def test_diet_log_updates_dashboard_nutrition(client: TestClient) -> None:
    headers = user_headers(client)
    banana_id = get_food_id(client, "banana")

    log_response = client.post(
        "/api/v1/diet/logs",
        headers=headers,
        json={
            "food_item_id": banana_id,
            "meal_type": "snack",
            "quantity": 2,
            "user_id": 1,
        },
    )
    summary_response = client.get("/api/v1/dashboard/summary", headers=headers)

    assert log_response.status_code == 201
    assert summary_response.status_code == 200
    nutrition = summary_response.json()["nutrition"]
    assert nutrition["total_calories"] == 210.0
    assert nutrition["calorie_goal"] is None
    assert nutrition["calories_remaining"] is None
    assert nutrition["meals_logged_today"] == 1


def test_dashboard_summary_uses_saved_profile_calorie_goal(
    client: TestClient,
) -> None:
    headers = user_headers(client)

    profile_response = client.put(
        "/api/v1/profiles/me",
        headers=headers,
        json={
            "calorie_goal": 1800,
            "protein_goal_g": 100,
            "carbs_goal_g": 200,
            "fats_goal_g": 60,
        },
    )
    summary_response = client.get("/api/v1/dashboard/summary", headers=headers)

    assert profile_response.status_code == 200
    assert summary_response.status_code == 200
    nutrition = summary_response.json()["nutrition"]
    assert nutrition["calorie_goal"] == 1800
    assert nutrition["calories_remaining"] == 1800
    assert nutrition["goal_is_set"] is True
    assert nutrition["protein_goal_g"] == 100


def test_workout_result_updates_dashboard_workout_stats(client: TestClient) -> None:
    headers = user_headers(client)

    result_response = client.post(
        "/api/v1/results",
        headers=headers,
        json={
            "correct_reps": 8,
            "duration_seconds": 90,
            "feedback_tags": ["back_alignment"],
            "incorrect_reps": 2,
            "primary_feedback": "Keep your back steady.",
            "total_reps": 10,
            "user_id": 1,
            "workout_type": "squat",
        },
    )
    summary_response = client.get("/api/v1/dashboard/summary", headers=headers)

    assert result_response.status_code == 201
    assert summary_response.status_code == 200
    workouts = summary_response.json()["workouts"]
    assert workouts["total_sessions"] == 1
    assert workouts["total_reps"] == 10
    assert workouts["average_form_score"] == 80
    assert workouts["latest_session"]["form_score"] == 80


def test_workout_summary_empty_user_returns_zeros(client: TestClient) -> None:
    response = client.get(
        "/api/v1/workouts/summary",
        headers=create_token_for_new_user(client),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 0
    assert data["total_reps"] == 0
    assert data["best_score"] == 0
    assert data["average_form_score"] == 0
    assert data["active_streak"] == 0
    assert data["recent_sessions"] == []
    assert len(data["exercise_stats"]) == 8
    assert {item["exercise_key"] for item in data["exercise_stats"]} == {
        "bicep_curl",
        "crunch",
        "jumping_jacks",
        "lunges",
        "mountain_climbers",
        "plank",
        "push_up",
        "squat",
    }
    assert all(item["total_sessions"] == 0 for item in data["exercise_stats"])
    assert all(item["last_score"] is None for item in data["exercise_stats"])


def test_workout_summary_after_saved_result_returns_real_counts(
    client: TestClient,
) -> None:
    headers = user_headers(client)
    result_response = client.post(
        "/api/v1/results",
        headers=headers,
        json={
            "correct_reps": 8,
            "duration_seconds": 90,
            "feedback_tags": ["back_alignment"],
            "incorrect_reps": 2,
            "primary_feedback": "Keep your back steady.",
            "total_reps": 10,
            "user_id": 1,
            "workout_type": "squat",
        },
    )
    response = client.get("/api/v1/workouts/summary", headers=headers)

    assert result_response.status_code == 201
    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 1
    assert data["total_reps"] == 10
    assert data["best_score"] == 80
    assert data["average_form_score"] == 80
    assert data["active_streak"] == 1
    assert len(data["recent_sessions"]) == 1

    squat_stats = next(
        item for item in data["exercise_stats"] if item["exercise_key"] == "squat"
    )
    push_up_stats = next(
        item for item in data["exercise_stats"] if item["exercise_key"] == "push_up"
    )
    assert squat_stats["total_sessions"] == 1
    assert squat_stats["total_reps"] == 10
    assert squat_stats["last_score"] == 80
    assert squat_stats["best_score"] == 80
    assert squat_stats["average_score"] == 80
    assert squat_stats["last_session_at"] is not None
    assert push_up_stats["total_sessions"] == 0
    assert push_up_stats["last_score"] is None


def test_admin_summary_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/admin/summary")

    assert response.status_code == 401


def test_admin_summary_blocks_normal_user(client: TestClient) -> None:
    response = client.get("/api/v1/admin/summary", headers=user_headers(client))

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


def test_admin_summary_returns_real_counts_for_admin(client: TestClient) -> None:
    response = client.get("/api/v1/admin/summary", headers=admin_headers(client))

    assert response.status_code == 200
    data = response.json()
    assert data["total_users"] == 2
    assert data["verified_users"] == 2
    assert data["admin_users"] == 1
    assert data["total_plans"] == 3
    assert data["total_videos"] == 0
    assert data["active_videos"] == 0
    assert data["premium_videos"] == 0
    assert data["total_subscriptions"] == 0


def test_results_me_returns_only_current_user_data(client: TestClient) -> None:
    user_token = user_headers(client)
    admin_token = admin_headers(client)
    user_result_response = client.post(
        "/api/v1/results",
        headers=user_token,
        json={
            "correct_reps": 8,
            "duration_seconds": 90,
            "feedback_tags": ["back_alignment"],
            "incorrect_reps": 2,
            "primary_feedback": "Keep your back steady.",
            "total_reps": 10,
            "user_id": 1,
            "workout_type": "squat",
        },
    )
    other_profile_response = client.post(
        "/api/v1/profiles",
        json={
            "age": 26,
            "experience_level": "beginner",
            "fitness_goal": "general_fitness",
            "height_cm": 170,
            "name": "Other User",
            "weight_kg": 70,
        },
    )
    other_user_id = other_profile_response.json()["id"]
    admin_result_response = client.post(
        "/api/v1/results",
        headers=admin_token,
        json={
            "correct_reps": 4,
            "duration_seconds": 60,
            "feedback_tags": [],
            "incorrect_reps": 1,
            "primary_feedback": None,
            "total_reps": 5,
            "user_id": other_user_id,
            "workout_type": "push_up",
        },
    )
    response = client.get("/api/v1/results/me", headers=user_token)

    assert user_result_response.status_code == 201
    assert other_profile_response.status_code == 201
    assert admin_result_response.status_code == 201
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["user_id"] == 1


def test_subscription_me_returns_free_inactive_without_subscription(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/subscription/me", headers=user_headers(client))

    assert response.status_code == 200
    data = response.json()
    assert data["id"] is None
    assert data["plan_id"] is None
    assert data["status"] == "inactive"
    assert data["plan"]["name"] == "Free"
    assert data["unlocks_premium"] is False
