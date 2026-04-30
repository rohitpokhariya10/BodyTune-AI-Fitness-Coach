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


def valid_result_payload(user_id: int) -> dict[str, object]:
    return {
        "user_id": user_id,
        "workout_type": "squat",
        "duration_seconds": 90,
        "total_reps": 10,
        "correct_reps": 8,
        "incorrect_reps": 2,
        "primary_feedback": "Keep your back steady.",
        "feedback_tags": ["back_alignment", "shallow_depth"],
    }


def create_result(client: TestClient, user_id: int) -> dict[str, object]:
    response = client.post("/api/v1/results", json=valid_result_payload(user_id))
    assert response.status_code == 201
    return dict(response.json())


def test_create_workout_result(client: TestClient) -> None:
    user_id = create_profile(client)

    response = client.post("/api/v1/results", json=valid_result_payload(user_id))

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 1
    assert data["user_id"] == user_id
    assert data["workout_type"] == "squat"
    assert data["feedback_tags"] == ["back_alignment", "shallow_depth"]
    assert "created_at" in data


def test_reject_result_for_missing_user(client: TestClient) -> None:
    response = client.post("/api/v1/results", json=valid_result_payload(user_id=999))

    assert response.status_code == 404
    assert response.json()["detail"] == "User profile with id 999 was not found"


def test_reject_invalid_workout_type(client: TestClient) -> None:
    user_id = create_profile(client)
    payload = valid_result_payload(user_id)
    payload["workout_type"] = "burpee"

    response = client.post("/api/v1/results", json=payload)

    assert response.status_code == 422


def test_reject_rep_mismatch(client: TestClient) -> None:
    user_id = create_profile(client)
    payload = valid_result_payload(user_id)
    payload["correct_reps"] = 7

    response = client.post("/api/v1/results", json=payload)

    assert response.status_code == 422
    assert "correct_reps + incorrect_reps must equal total_reps" in str(
        response.json(),
    )


def test_reject_invalid_feedback_tags(client: TestClient) -> None:
    user_id = create_profile(client)
    payload = valid_result_payload(user_id)
    payload["feedback_tags"] = ["back_alignment", 123]

    response = client.post("/api/v1/results", json=payload)

    assert response.status_code == 422


def test_list_results_for_user(client: TestClient) -> None:
    first_user_id = create_profile(client, name="Rohit")
    second_user_id = create_profile(client, name="Asha")
    create_result(client, first_user_id)
    create_result(client, first_user_id)
    create_result(client, second_user_id)

    response = client.get(f"/api/v1/results/user/{first_user_id}")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert {item["user_id"] for item in data} == {first_user_id}


def test_get_result_by_id(client: TestClient) -> None:
    user_id = create_profile(client)
    result = create_result(client, user_id)

    response = client.get(f"/api/v1/results/{result['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == result["id"]


def test_delete_result(client: TestClient) -> None:
    user_id = create_profile(client)
    result = create_result(client, user_id)

    delete_response = client.delete(f"/api/v1/results/{result['id']}")
    get_response = client.get(f"/api/v1/results/{result['id']}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404
