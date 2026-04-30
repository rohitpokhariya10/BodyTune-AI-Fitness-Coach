from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from fastapi.routing import APIRoute
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db.base import Base, create_all_tables
from app.db.session import get_db
from app.main import app
from app.repositories.auth_repository import AuthUserRepository


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
        setattr(test_client, "_testing_session_local", TestingSessionLocal)
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


def valid_profile_payload() -> dict[str, object]:
    return {
        "name": "Rohit",
        "age": 24,
        "height_cm": 175.0,
        "weight_kg": 72.0,
        "fitness_goal": "strength",
        "experience_level": "beginner",
    }


def create_user_headers(client: TestClient) -> dict[str, str]:
    session_local = getattr(client, "_testing_session_local")
    with session_local() as db:
        user = AuthUserRepository(db).create(
            {
                "age": None,
                "email": "profile@example.com",
                "experience_level": None,
                "fitness_goal": None,
                "height_cm": None,
                "is_verified": True,
                "name": "Profile User",
                "password_hash": hash_password("Profile@123"),
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


def test_create_profile(client: TestClient) -> None:
    response = client.post("/api/v1/profiles", json=valid_profile_payload())

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == "Rohit"
    assert data["fitness_goal"] == "strength"
    assert data["experience_level"] == "beginner"
    assert "created_at" in data
    assert "updated_at" in data


def test_get_profile(client: TestClient) -> None:
    created = client.post("/api/v1/profiles", json=valid_profile_payload())
    profile_id = created.json()["id"]

    response = client.get(f"/api/v1/profiles/{profile_id}")

    assert response.status_code == 200
    assert response.json()["id"] == profile_id


def test_update_profile(client: TestClient) -> None:
    created = client.post("/api/v1/profiles", json=valid_profile_payload())
    profile_id = created.json()["id"]

    response = client.put(
        f"/api/v1/profiles/{profile_id}",
        json={"fitness_goal": "mobility", "experience_level": "intermediate"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["fitness_goal"] == "mobility"
    assert data["experience_level"] == "intermediate"


def test_delete_profile(client: TestClient) -> None:
    created = client.post("/api/v1/profiles", json=valid_profile_payload())
    profile_id = created.json()["id"]

    delete_response = client.delete(f"/api/v1/profiles/{profile_id}")
    get_response = client.get(f"/api/v1/profiles/{profile_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_invalid_fitness_goal_rejected(client: TestClient) -> None:
    payload = valid_profile_payload()
    payload["fitness_goal"] = "injury_prediction"

    response = client.post("/api/v1/profiles", json=payload)

    assert response.status_code == 422


def test_profile_me_routes_are_registered_before_profile_id_routes() -> None:
    profile_routes = [
        route
        for route in app.routes
        if isinstance(route, APIRoute)
        and route.path.startswith("/api/v1/profiles")
    ]
    route_order = [
        (route.path, method)
        for route in profile_routes
        for method in sorted(route.methods or [])
    ]

    assert route_order.index(("/api/v1/profiles/me", "GET")) < route_order.index(
        ("/api/v1/profiles/{profile_id}", "GET"),
    )
    assert route_order.index(("/api/v1/profiles/me", "PUT")) < route_order.index(
        ("/api/v1/profiles/{profile_id}", "PUT"),
    )


def test_get_profile_me_returns_current_users_profile(client: TestClient) -> None:
    headers = create_user_headers(client)

    response = client.get("/api/v1/profiles/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == "Profile User"


def test_profile_me_accepts_valid_numeric_payload(client: TestClient) -> None:
    headers = create_user_headers(client)

    response = client.put(
        "/api/v1/profiles/me",
        headers=headers,
        json={
            "age": 23,
            "calorie_goal": 40000,
            "carbs_goal_g": 37,
            "experience_level": "beginner",
            "fats_goal_g": 42,
            "fitness_goal": "general_fitness",
            "height_cm": 180,
            "name": "pokhariya ji",
            "protein_goal_g": 30,
            "weight_kg": 68,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "pokhariya ji"
    assert data["age"] == 23
    assert data["height_cm"] == 180
    assert data["weight_kg"] == 68
    assert data["calorie_goal"] == 40000
    assert data["protein_goal_g"] == 30
    assert data["carbs_goal_g"] == 37
    assert data["fats_goal_g"] == 42


def test_profile_me_accepts_null_body_metrics(client: TestClient) -> None:
    headers = create_user_headers(client)

    response = client.put(
        "/api/v1/profiles/me",
        headers=headers,
        json={
            "age": None,
            "height_cm": None,
            "name": "Profile User",
            "weight_kg": None,
        },
    )

    assert response.status_code == 200


def test_profile_me_persists_and_returns_saved_data(client: TestClient) -> None:
    headers = create_user_headers(client)

    save_response = client.put(
        "/api/v1/profiles/me",
        headers=headers,
        json={
            "age": 24,
            "calorie_goal": 2200,
            "carbs_goal_g": 250,
            "fats_goal_g": 70,
            "height_cm": 181,
            "name": "Saved User",
            "protein_goal_g": 120,
            "weight_kg": 72,
        },
    )
    get_response = client.get("/api/v1/profiles/me", headers=headers)

    assert save_response.status_code == 200
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Saved User"
    assert get_response.json()["height_cm"] == 181
    assert get_response.json()["calorie_goal"] == 2200
    assert get_response.json()["protein_goal_g"] == 120
    assert get_response.json()["carbs_goal_g"] == 250
    assert get_response.json()["fats_goal_g"] == 70
