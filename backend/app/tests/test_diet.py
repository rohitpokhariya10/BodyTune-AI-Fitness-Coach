from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.base import Base, create_all_tables
from app.db.seeds import seed_food_items
from app.db.session import get_db
from app.main import app

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde"
    b"\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01"
    b"\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82"
)


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

    create_all_tables(bind=test_engine)
    with TestingSessionLocal() as db:
        seed_food_items(db)

    settings = get_settings()
    original_upload_dir = settings.upload_dir
    settings.upload_dir = tmp_path / "uploads"

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    settings.upload_dir = original_upload_dir
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


def get_food_id(client: TestClient, name: str) -> int:
    response = client.get("/api/v1/foods/search", params={"q": name})
    assert response.status_code == 200
    matches = response.json()
    assert matches
    return int(matches[0]["id"])


def upload_photo(client: TestClient, user_id: int, filename: str) -> dict[str, object]:
    response = client.post(
        "/api/v1/diet/photos/upload",
        data={"user_id": str(user_id), "meal_type": "breakfast"},
        files={"file": (filename, PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    return dict(response.json())


def test_food_seed_list(client: TestClient) -> None:
    response = client.get("/api/v1/foods")

    assert response.status_code == 200
    foods = response.json()
    names = {food["name"] for food in foods}
    assert len(foods) >= 150
    assert {
        "apple",
        "banana",
        "burger",
        "chicken breast",
        "egg",
        "mango",
        "naan",
        "orange",
        "pizza",
        "pulao",
        "tofu",
    }.issubset(names)
    apple = next(food for food in foods if food["name"] == "apple")
    assert "aliases" in apple
    assert apple["is_custom"] is False


def test_food_search(client: TestClient) -> None:
    response = client.get("/api/v1/foods/search", params={"q": "banana"})

    assert response.status_code == 200
    foods = response.json()
    assert len(foods) == 1
    assert foods[0]["name"] == "banana"


def test_food_search_supports_common_aliases(client: TestClient) -> None:
    alias_expectations = {
        "anda": {"egg"},
        "chapati": {"roti"},
        "dahi": {"curd"},
        "doodh": {"milk"},
        "rice": {"rice", "brown rice", "fried rice", "biryani"},
    }

    for query, expected_names in alias_expectations.items():
        response = client.get("/api/v1/foods/search", params={"q": query})
        assert response.status_code == 200
        names = {food["name"] for food in response.json()}
        assert expected_names.issubset(names)


def test_photo_upload_validation(client: TestClient) -> None:
    user_id = create_profile(client)

    valid_response = client.post(
        "/api/v1/diet/photos/upload",
        data={"user_id": str(user_id), "meal_type": "breakfast"},
        files={"file": ("meal.png", PNG_BYTES, "image/png")},
    )
    invalid_response = client.post(
        "/api/v1/diet/photos/upload",
        data={"user_id": str(user_id), "meal_type": "breakfast"},
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )

    assert valid_response.status_code == 201
    assert valid_response.json()["analysis_status"] == "needs_confirmation"
    assert valid_response.json()["image_path"].startswith("uploads/meal_photos/")
    assert valid_response.json()["message"] == (
        "Confirm suggested foods and serving quantity for accurate nutrition."
    )
    assert valid_response.json()["suggested_foods"] == []
    assert invalid_response.status_code == 400
    assert invalid_response.json()["detail"] == "Uploaded file must be an image"


def test_upload_photo_with_banana_filename_returns_empty_suggestions(
    client: TestClient,
) -> None:
    user_id = create_profile(client)

    data = upload_photo(client, user_id, "banana-breakfast.png")

    assert data["suggested_foods"] == []


def test_upload_photo_with_rice_filename_returns_empty_suggestions(
    client: TestClient,
) -> None:
    user_id = create_profile(client)

    data = upload_photo(client, user_id, "rice-bowl.png")

    assert data["suggested_foods"] == []


def test_upload_photo_with_unknown_filename_returns_empty_suggestions(
    client: TestClient,
) -> None:
    user_id = create_profile(client)

    data = upload_photo(client, user_id, "meal-photo.png")

    assert data["suggested_foods"] == []


def test_photo_suggestions_endpoint(client: TestClient) -> None:
    user_id = create_profile(client)
    upload_data = upload_photo(client, user_id, "paneer-lunch.png")

    response = client.get(
        f"/api/v1/diet/photos/{upload_data['photo_id']}/suggestions",
    )

    assert response.status_code == 200
    data = response.json()
    assert data["photo_id"] == upload_data["photo_id"]
    assert data["suggested_foods"][0]["name"] == "paneer"


def test_diet_log_create(client: TestClient) -> None:
    user_id = create_profile(client)
    food_item_id = get_food_id(client, "banana")

    response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "food_item_id": food_item_id,
            "quantity": 2,
            "meal_type": "snack",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["calories"] == 210.0
    assert data["protein_g"] == 2.6
    assert data["carbs_g"] == 54.0
    assert data["fats_g"] == 0.8


def test_delete_diet_log_removes_log_and_updates_summary(client: TestClient) -> None:
    user_id = create_profile(client)
    banana_id = get_food_id(client, "banana")
    egg_id = get_food_id(client, "egg")

    banana_response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "food_item_id": banana_id,
            "quantity": 1,
            "meal_type": "breakfast",
        },
    )
    egg_response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "food_item_id": egg_id,
            "quantity": 2,
            "meal_type": "breakfast",
        },
    )

    assert banana_response.status_code == 201
    assert egg_response.status_code == 201
    deleted_log_id = banana_response.json()["id"]

    delete_response = client.delete(f"/api/v1/diet/logs/{deleted_log_id}")
    logs_response = client.get(f"/api/v1/diet/logs/user/{user_id}")
    summary_response = client.get(f"/api/v1/diet/summary/user/{user_id}")

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "deleted_id": deleted_log_id,
        "message": "Diet log deleted successfully",
    }
    assert logs_response.status_code == 200
    logs = logs_response.json()
    assert len(logs) == 1
    assert logs[0]["id"] == egg_response.json()["id"]
    assert deleted_log_id not in {log["id"] for log in logs}
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_calories"] == 156.0
    assert summary["total_protein_g"] == 12.0
    assert summary["total_carbs_g"] == 1.2
    assert summary["total_fats_g"] == 10.0
    assert len(summary["meal_groups"]["breakfast"]) == 1


def test_delete_missing_diet_log_returns_404(client: TestClient) -> None:
    response = client.delete("/api/v1/diet/logs/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Diet log with id 999 was not found"


def test_diet_log_create_with_custom_food(client: TestClient) -> None:
    user_id = create_profile(client)

    response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "custom_food": {
                "name": "homemade protein laddoo",
                "aliases": ["laddoo"],
                "serving_unit": "1 piece",
                "calories_per_serving": 180,
                "protein_g": 8,
                "carbs_g": 20,
                "fats_g": 8,
            },
            "quantity": 2,
            "meal_type": "snack",
        },
    )
    search_response = client.get(
        "/api/v1/foods/search",
        params={"q": "laddoo"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["calories"] == 360.0
    assert data["protein_g"] == 16.0
    assert data["carbs_g"] == 40.0
    assert data["fats_g"] == 16.0
    assert search_response.status_code == 200
    custom_food = search_response.json()[0]
    assert custom_food["name"] == "homemade protein laddoo"
    assert custom_food["is_custom"] is True


def test_diet_log_rejects_missing_food_selection(client: TestClient) -> None:
    user_id = create_profile(client)

    response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "quantity": 1,
            "meal_type": "snack",
        },
    )

    assert response.status_code == 422


def test_reject_invalid_user(client: TestClient) -> None:
    food_item_id = get_food_id(client, "banana")

    response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": 999,
            "food_item_id": food_item_id,
            "quantity": 1,
            "meal_type": "snack",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "User profile with id 999 was not found"


def test_reject_invalid_food(client: TestClient) -> None:
    user_id = create_profile(client)

    response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "food_item_id": 999,
            "quantity": 1,
            "meal_type": "snack",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Food item with id 999 was not found"


def test_reject_invalid_quantity(client: TestClient) -> None:
    user_id = create_profile(client)
    food_item_id = get_food_id(client, "banana")

    response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "food_item_id": food_item_id,
            "quantity": 0,
            "meal_type": "snack",
        },
    )

    assert response.status_code == 422


def test_diet_summary(client: TestClient) -> None:
    user_id = create_profile(client)
    banana_id = get_food_id(client, "banana")
    egg_id = get_food_id(client, "egg")

    first_response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "food_item_id": banana_id,
            "quantity": 1,
            "meal_type": "breakfast",
        },
    )
    second_response = client.post(
        "/api/v1/diet/logs",
        json={
            "user_id": user_id,
            "food_item_id": egg_id,
            "quantity": 2,
            "meal_type": "breakfast",
        },
    )
    summary_response = client.get(f"/api/v1/diet/summary/user/{user_id}")

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_calories"] == 261.0
    assert summary["total_protein_g"] == 13.3
    assert len(summary["meal_groups"]["breakfast"]) == 2
    assert summary["meal_groups"]["lunch"] == []
