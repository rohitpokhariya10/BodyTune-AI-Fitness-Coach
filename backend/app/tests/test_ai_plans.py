from fastapi.testclient import TestClient

from app.tests.test_auth import client, login_headers
from app.schemas.ai_plan import AIPlanGenerateRequest
from app.services.ai_plan_service import calculate_hydration, generate_rule_based_plan


def plan_payload() -> dict[str, object]:
    return {
        "activity_level": "moderate",
        "age": 29,
        "allergies_restrictions": "Avoid peanuts",
        "budget": "low",
        "days_per_week": 4,
        "diet_type": "vegetarian",
        "duration_days": 7,
        "equipment": "bodyweight, dumbbells",
        "experience_level": "beginner",
        "gender": "male",
        "goal": "fat_loss",
        "height_cm": 176,
        "meals_per_day": 4,
        "medical_note": "",
        "monthly_budget": 8000,
        "weight_kg": 82,
        "workout_location": "home",
        "workout_time_minutes": 45,
    }


def generated_text(payload: dict[str, object]) -> str:
    plan = generate_rule_based_plan(AIPlanGenerateRequest(**payload))
    return str(plan).lower()


def assert_terms_absent(text: str, terms: list[str]) -> None:
    for term in terms:
        assert term not in text


def test_generate_ai_plan_requires_auth(client: TestClient) -> None:
    response = client.post("/api/v1/ai-plans/generate", json=plan_payload())

    assert response.status_code == 401


def test_authenticated_user_can_generate_and_list_ai_plan(client: TestClient) -> None:
    headers = login_headers(client, "user@fitcoach.local", "User@123")

    response = client.post(
        "/api/v1/ai-plans/generate",
        headers=headers,
        json=plan_payload(),
    )
    list_response = client.get("/api/v1/ai-plans", headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert data["goal"] == "fat_loss"
    assert data["duration_days"] == 7
    assert data["plan_data"]["summary"]["calories_per_day"] > 0
    assert data["plan_data"]["macros"]["protein_g"] > 0
    assert data["plan_data"]["hydration"]["liters_per_day"] > 2.0
    assert data["plan_data"]["personalization_reasons"]
    assert len(data["plan_data"]["workouts"]) == 7
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == data["id"]
    assert list_response.json()[0]["plan_data"]["hydration"]["liters_per_day"] == data["plan_data"]["hydration"]["liters_per_day"]


def test_ai_plan_owner_access_and_delete(client: TestClient) -> None:
    user_headers = login_headers(client, "user@fitcoach.local", "User@123")
    admin_headers = login_headers(client, "admin@fitcoach.local", "Admin@123")
    created = client.post(
        "/api/v1/ai-plans/generate",
        headers=user_headers,
        json=plan_payload(),
    ).json()

    blocked_response = client.get(
        f"/api/v1/ai-plans/{created['id']}",
        headers=admin_headers,
    )
    owner_response = client.get(
        f"/api/v1/ai-plans/{created['id']}",
        headers=user_headers,
    )
    delete_response = client.delete(
        f"/api/v1/ai-plans/{created['id']}",
        headers=user_headers,
    )
    deleted_response = client.get(
        f"/api/v1/ai-plans/{created['id']}",
        headers=user_headers,
    )

    assert blocked_response.status_code == 404
    assert owner_response.status_code == 200
    assert delete_response.status_code == 204
    assert deleted_response.status_code == 404


def test_vegetarian_plan_never_contains_non_vegetarian_foods() -> None:
    payload = plan_payload()
    payload["diet_type"] = "vegetarian"
    payload["budget"] = "high"

    text = generated_text(payload)

    assert_terms_absent(text, ["chicken", "eggs", "egg", "fish", "meat", "seafood"])


def test_vegan_plan_never_contains_dairy_eggs_or_meat() -> None:
    payload = plan_payload()
    payload["diet_type"] = "vegan"
    payload["budget"] = "high"

    text = generated_text(payload)

    assert_terms_absent(text, ["milk", "curd", "yogurt", "paneer", "cheese", "whey", "eggs", "egg", "chicken", "fish", "meat"])


def test_eggetarian_plan_can_include_eggs_but_not_meat_or_fish() -> None:
    payload = plan_payload()
    payload["diet_type"] = "eggetarian"
    payload["budget"] = "medium"

    text = generated_text(payload)

    assert "eggs" in text
    assert_terms_absent(text, ["chicken", "fish", "meat", "seafood"])


def test_non_vegetarian_plan_can_include_chicken_and_eggs_without_restriction() -> None:
    payload = plan_payload()
    payload["diet_type"] = "non_vegetarian"
    payload["budget"] = "medium"
    payload["allergies_restrictions"] = ""

    text = generated_text(payload)

    assert "chicken" in text
    assert "eggs" in text


def test_lactose_intolerance_removes_dairy_foods() -> None:
    payload = plan_payload()
    payload["diet_type"] = "vegetarian"
    payload["budget"] = "high"
    payload["allergies_restrictions"] = "lactose intolerance"

    text = generated_text(payload)

    assert_terms_absent(text, ["milk", "curd", "yogurt", "paneer", "cheese", "whey"])


def test_chronic_kidney_disease_adds_safety_note_and_conservative_protein() -> None:
    payload = plan_payload()
    payload["diet_type"] = "vegetarian"
    payload["medical_note"] = "chronic kidney disease"

    plan = generate_rule_based_plan(AIPlanGenerateRequest(**payload))
    text = str(plan).lower()

    assert "because you mentioned chronic kidney disease" in text
    assert "doctor or registered dietitian" in text
    assert "high-protein" in text
    assert plan["macros"]["protein_g"] <= round(float(payload["weight_kg"]) * 1.0)
    assert "increase protein" not in text


def test_generator_returns_workout_day_for_each_selected_duration() -> None:
    for duration in (7, 14, 30):
        payload = plan_payload()
        payload["duration_days"] = duration

        plan = generate_rule_based_plan(AIPlanGenerateRequest(**payload))

        assert len(plan["workouts"]) == duration
        assert [day["day"] for day in plan["workouts"]] == list(range(1, duration + 1))


def test_hydration_changes_by_weight_and_workout_time() -> None:
    light_user = plan_payload()
    light_user["weight_kg"] = 50
    light_user["workout_time_minutes"] = 30
    heavy_user = plan_payload()
    heavy_user["weight_kg"] = 90
    heavy_user["workout_time_minutes"] = 90

    light_hydration = calculate_hydration(AIPlanGenerateRequest(**light_user))
    heavy_hydration = calculate_hydration(AIPlanGenerateRequest(**heavy_user))

    assert light_hydration["liters_per_day"] != heavy_hydration["liters_per_day"]
    assert heavy_hydration["liters_per_day"] > light_hydration["liters_per_day"]


def test_hydration_example_is_dynamic_and_explained() -> None:
    payload = plan_payload()
    payload["weight_kg"] = 70
    payload["activity_level"] = "moderate"
    payload["workout_time_minutes"] = 45
    payload["goal"] = "fat_loss"

    hydration = calculate_hydration(AIPlanGenerateRequest(**payload))

    assert 3.2 <= hydration["liters_per_day"] <= 3.7
    assert "70kg body weight" in hydration["note"]
    assert "45-minute workouts" in hydration["note"]


def test_three_days_per_week_returns_three_training_days_for_week() -> None:
    payload = plan_payload()
    payload["duration_days"] = 7
    payload["days_per_week"] = 3

    plan = generate_rule_based_plan(AIPlanGenerateRequest(**payload))
    training_days = [day for day in plan["workouts"] if day["type"] == "training"]
    recovery_days = [day for day in plan["workouts"] if day["type"] == "recovery"]

    assert len(training_days) == 3
    assert len(recovery_days) == 4


def test_plan_hydration_uses_generated_value_not_static_default() -> None:
    payload = plan_payload()
    payload["weight_kg"] = 70
    payload["activity_level"] = "moderate"
    payload["workout_time_minutes"] = 45
    payload["goal"] = "fat_loss"

    plan = generate_rule_based_plan(AIPlanGenerateRequest(**payload))

    assert plan["hydration"]["liters_per_day"] == 3.5
    assert plan["hydration"]["liters_per_day"] != 2.5
    assert "45-minute workouts" in plan["hydration"]["note"]


def test_meals_per_day_controls_number_of_meal_cards() -> None:
    payload = plan_payload()
    payload["meals_per_day"] = 5

    plan = generate_rule_based_plan(AIPlanGenerateRequest(**payload))

    assert len(plan["meals"]) == 5
    assert all(meal["target_calories"] > 0 for meal in plan["meals"])
    assert all(meal["protein_g"] > 0 and meal["carbs_g"] > 0 and meal["fats_g"] > 0 for meal in plan["meals"])


def test_budget_changes_food_suggestions() -> None:
    low_budget = plan_payload()
    low_budget["budget"] = "low"
    high_budget = plan_payload()
    high_budget["budget"] = "high"

    low_plan = generate_rule_based_plan(AIPlanGenerateRequest(**low_budget))
    high_plan = generate_rule_based_plan(AIPlanGenerateRequest(**high_budget))

    assert low_plan["budget_foods"] != high_plan["budget_foods"]
    assert "oats" in low_plan["budget_foods"]
    assert "quinoa" in high_plan["budget_foods"]


def test_injury_note_adapts_workouts_and_adds_safety_note() -> None:
    payload = plan_payload()
    payload["medical_note"] = "knee pain, avoid jumping"
    payload["days_per_week"] = 4

    plan = generate_rule_based_plan(AIPlanGenerateRequest(**payload))
    text = str(plan).lower()

    assert "pain or injury" in text
    assert "mountain climber" not in text
    assert "marching in place" in text or "box squat" in text or "supported step-back reach" in text
