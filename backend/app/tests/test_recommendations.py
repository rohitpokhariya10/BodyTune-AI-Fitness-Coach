from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base, create_all_tables
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
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

    create_all_tables(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def valid_profile_payload(name: str = "Rohit") -> dict[str, object]:
    return {
        "name": name,
        "age": 24,
        "height_cm": 175.0,
        "weight_kg": 72.0,
        "fitness_goal": "strength",
        "experience_level": "beginner",
    }


def create_profile(client: TestClient, name: str = "Rohit") -> int:
    response = client.post("/api/v1/profiles", json=valid_profile_payload(name))
    assert response.status_code == 201
    return int(response.json()["id"])


def result_payload(
    user_id: int,
    *,
    total_reps: int = 10,
    correct_reps: int = 7,
    incorrect_reps: int = 3,
    feedback_tags: list[str] | None = None,
) -> dict[str, object]:
    return {
        "user_id": user_id,
        "workout_type": "squat",
        "duration_seconds": 90,
        "total_reps": total_reps,
        "correct_reps": correct_reps,
        "incorrect_reps": incorrect_reps,
        "primary_feedback": "Keep your movement controlled.",
        "feedback_tags": feedback_tags or [],
    }


def create_result(
    client: TestClient,
    user_id: int,
    *,
    feedback_tags: list[str] | None = None,
) -> int:
    response = client.post(
        "/api/v1/results",
        json=result_payload(user_id, feedback_tags=feedback_tags),
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def create_recommendation(
    client: TestClient,
    *,
    user_id: int,
    workout_result_id: int,
) -> dict[str, object]:
    response = client.post(
        "/api/v1/recommendations",
        json={"user_id": user_id, "workout_result_id": workout_result_id},
    )
    assert response.status_code == 201
    return dict(response.json())


def test_generate_recommendation_for_valid_workout_result(
    client: TestClient,
) -> None:
    user_id = create_profile(client)
    workout_result_id = create_result(client, user_id)

    response = client.post(
        "/api/v1/recommendations",
        json={"user_id": user_id, "workout_result_id": workout_result_id},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 1
    assert data["user_id"] == user_id
    assert data["workout_result_id"] == workout_result_id
    assert data["recommendation_type"] == "form"
    assert data["message"]
    assert "created_at" in data


def test_reject_missing_user(client: TestClient) -> None:
    user_id = create_profile(client)
    workout_result_id = create_result(client, user_id)

    response = client.post(
        "/api/v1/recommendations",
        json={"user_id": 999, "workout_result_id": workout_result_id},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "User profile with id 999 was not found"


def test_reject_missing_workout_result(client: TestClient) -> None:
    user_id = create_profile(client)

    response = client.post(
        "/api/v1/recommendations",
        json={"user_id": user_id, "workout_result_id": 999},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workout result with id 999 was not found"


def test_reject_workout_result_that_does_not_belong_to_user(
    client: TestClient,
) -> None:
    first_user_id = create_profile(client, name="Rohit")
    second_user_id = create_profile(client, name="Asha")
    workout_result_id = create_result(client, first_user_id)

    response = client.post(
        "/api/v1/recommendations",
        json={"user_id": second_user_id, "workout_result_id": workout_result_id},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        f"Workout result {workout_result_id} does not belong to user {second_user_id}"
    )


def test_list_recommendations_for_user(client: TestClient) -> None:
    first_user_id = create_profile(client, name="Rohit")
    second_user_id = create_profile(client, name="Asha")
    first_result_id = create_result(client, first_user_id)
    second_result_id = create_result(client, first_user_id)
    third_result_id = create_result(client, second_user_id)
    create_recommendation(
        client,
        user_id=first_user_id,
        workout_result_id=first_result_id,
    )
    create_recommendation(
        client,
        user_id=first_user_id,
        workout_result_id=second_result_id,
    )
    create_recommendation(
        client,
        user_id=second_user_id,
        workout_result_id=third_result_id,
    )

    response = client.get(f"/api/v1/recommendations/user/{first_user_id}")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert {item["user_id"] for item in data} == {first_user_id}


def test_get_recommendation_by_id(client: TestClient) -> None:
    user_id = create_profile(client)
    workout_result_id = create_result(client, user_id)
    recommendation = create_recommendation(
        client,
        user_id=user_id,
        workout_result_id=workout_result_id,
    )

    response = client.get(f"/api/v1/recommendations/{recommendation['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == recommendation["id"]


def test_delete_recommendation(client: TestClient) -> None:
    user_id = create_profile(client)
    workout_result_id = create_result(client, user_id)
    recommendation = create_recommendation(
        client,
        user_id=user_id,
        workout_result_id=workout_result_id,
    )

    delete_response = client.delete(f"/api/v1/recommendations/{recommendation['id']}")
    get_response = client.get(f"/api/v1/recommendations/{recommendation['id']}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_recommendation_message_has_no_medical_injury_prediction_wording(
    client: TestClient,
) -> None:
    user_id = create_profile(client)
    workout_result_id = create_result(
        client,
        user_id,
        feedback_tags=["shallow_depth"],
    )

    recommendation = create_recommendation(
        client,
        user_id=user_id,
        workout_result_id=workout_result_id,
    )
    message = str(recommendation["message"]).lower()
    banned_terms = [
        "injury",
        "medical",
        "diagnosis",
        "disease",
        "risk prediction",
        "predict",
        "prevention",
    ]

    assert all(term not in message for term in banned_terms)
