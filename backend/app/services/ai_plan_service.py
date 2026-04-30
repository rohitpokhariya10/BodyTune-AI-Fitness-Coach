from __future__ import annotations

from math import ceil
import re
from typing import Any

from app.models.ai_plan import AIPlan
from app.repositories.ai_plan_repository import AIPlanRepository
from app.schemas.ai_plan import AIPlanGenerateRequest


class AIPlanNotFoundError(Exception):
    pass


class AIPlanService:
    def __init__(self, repository: AIPlanRepository) -> None:
        self.repository = repository

    def generate_and_save(self, user_id: int, request: AIPlanGenerateRequest) -> AIPlan:
        plan_data = generate_rule_based_plan(request)
        title = f"{goal_label(request.goal)} plan - {request.duration_days} days"
        return self.repository.create(
            user_id=user_id,
            title=title,
            goal=request.goal,
            input_data=request.model_dump(),
            plan_data=plan_data,
            duration_days=request.duration_days,
        )

    def list_for_user(self, user_id: int) -> list[AIPlan]:
        return self.repository.list_for_user(user_id)

    def get_for_user(self, plan_id: int, user_id: int) -> AIPlan:
        plan = self.repository.get_for_user(plan_id, user_id)
        if plan is None:
            raise AIPlanNotFoundError()
        return plan

    def delete_for_user(self, plan_id: int, user_id: int) -> None:
        self.repository.delete(self.get_for_user(plan_id, user_id))


def goal_label(goal: str) -> str:
    return goal.replace("_", " ").title()


def calculate_bmr(request: AIPlanGenerateRequest) -> float:
    base = 10 * request.weight_kg + 6.25 * request.height_cm - 5 * request.age
    if request.gender == "male":
        return base + 5
    if request.gender == "female":
        return base - 161
    return base - 78


def calculate_tdee(bmr: float, activity_level: str) -> float:
    activity_multiplier = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
    }[activity_level]
    return bmr * activity_multiplier


def calculate_calorie_target(tdee: float, goal: str) -> int:
    adjustments = {
        "fat_loss": -350,
        "muscle_gain": 300,
        "strength": 150,
        "endurance": 200,
        "general_fitness": 0,
    }
    return max(1300, round((tdee + adjustments.get(goal, 0)) / 25) * 25)


def has_kidney_condition(request: AIPlanGenerateRequest) -> bool:
    text = f"{request.allergies_restrictions} {request.medical_note}".lower()
    return any(
        term in text
        for term in (
            "chronic kidney disease",
            "kidney disease",
            "kidney disorder",
            "renal disease",
            "renal disorder",
            "ckd",
        )
    )


def parse_restrictions(request: AIPlanGenerateRequest) -> dict[str, bool]:
    text = f"{request.allergies_restrictions} {request.medical_note}".lower()
    return {
        "kidney": has_kidney_condition(request),
        "knee": any(term in text for term in ("knee", "acl", "meniscus")),
        "back": any(term in text for term in ("back pain", "lower back", "spine", "slip disc", "disc")),
        "shoulder": any(term in text for term in ("shoulder", "rotator cuff")),
        "lactose": "lactose" in text or "dairy" in text,
        "peanut": "peanut" in text,
        "egg": "egg" in text,
        "gluten": "gluten" in text,
        "no_onion_garlic": "onion" in text or "garlic" in text,
    }


def calculate_macros(calories: int, weight_kg: float, goal: str, kidney_condition: bool = False) -> dict[str, int]:
    if kidney_condition:
        protein = round(weight_kg * 0.85)
        fat = round((calories * 0.25) / 9)
        carbs = max(100, round((calories - protein * 4 - fat * 9) / 4))
        return {"protein_g": protein, "carbs_g": carbs, "fats_g": fat}

    protein_factor = {
        "fat_loss": 1.8,
        "muscle_gain": 2.0,
        "strength": 1.8,
        "endurance": 1.5,
        "general_fitness": 1.6,
    }.get(goal, 1.6)
    protein = round(weight_kg * protein_factor)
    fat_ratio = {
        "fat_loss": 0.22,
        "muscle_gain": 0.28,
        "strength": 0.25,
        "endurance": 0.25,
        "general_fitness": 0.25,
    }.get(goal, 0.25)
    fat = round((calories * fat_ratio) / 9)
    carbs = max(80, round((calories - protein * 4 - fat * 9) / 4))
    return {"protein_g": protein, "carbs_g": carbs, "fats_g": fat}


def calculate_hydration(request: AIPlanGenerateRequest) -> dict[str, Any]:
    base_liters = request.weight_kg * 35 / 1000
    if request.workout_time_minutes <= 30:
        workout_adjustment = 0.25
    elif request.workout_time_minutes <= 60:
        workout_adjustment = 0.5
    elif request.workout_time_minutes <= 90:
        workout_adjustment = 0.75
    else:
        workout_adjustment = 1.0

    activity_adjustment = {
        "sedentary": 0.0,
        "light": 0.2,
        "moderate": 0.35,
        "active": 0.5,
    }[request.activity_level]
    goal_adjustment = {
        "fat_loss": 0.2,
        "muscle_gain": 0.3,
        "endurance": 0.5,
        "strength": 0.2,
        "general_fitness": 0.2,
    }[request.goal]
    maximum = 5.5 if request.goal == "endurance" and request.workout_time_minutes > 90 else 5.0
    liters = min(maximum, max(2.0, base_liters + workout_adjustment + activity_adjustment + goal_adjustment))
    liters = round(liters, 1)
    return {
        "liters_per_day": liters,
        "base_liters": round(base_liters, 2),
        "workout_adjustment_liters": workout_adjustment,
        "activity_adjustment_liters": activity_adjustment,
        "goal_adjustment_liters": goal_adjustment,
        "note": (
            f"Based on {request.weight_kg:g}kg body weight, {request.activity_level.replace('_', ' ')} "
            f"activity, {request.workout_time_minutes}-minute workouts, and your {request.goal.replace('_', ' ')} goal."
        ),
    }


VEGETARIAN_PROTEIN_SOURCES = [
    "paneer",
    "tofu",
    "dal",
    "chana",
    "rajma",
    "beans",
    "lentils",
    "soy chunks",
    "curd",
    "milk",
    "yogurt",
]
VEGAN_PROTEIN_SOURCES = ["tofu", "soy chunks", "dal", "chana", "rajma", "beans", "lentils"]
EGGETARIAN_PROTEIN_SOURCES = [*VEGETARIAN_PROTEIN_SOURCES, "eggs"]
NON_VEG_PROTEIN_SOURCES = [*VEGETARIAN_PROTEIN_SOURCES, "eggs", "chicken", "fish"]
CARB_SOURCES = ["rice", "roti", "oats", "fruit", "banana", "potato", "millets"]
FAT_SOURCES = ["nuts", "seeds", "peanut butter", "peanuts"]
FRUITS_VEGETABLES = ["fruits", "vegetables", "seasonal vegetables", "leafy greens", "salad"]

DIET_DISALLOWED_TERMS = {
    "vegetarian": ["chicken", "fish", "meat", "eggs", "egg", "tuna", "turkey", "mutton", "beef", "pork", "seafood"],
    "eggetarian": ["chicken", "fish", "meat", "tuna", "turkey", "mutton", "beef", "pork", "seafood"],
    "vegan": ["milk", "curd", "yogurt", "paneer", "cheese", "whey", "eggs", "egg", "chicken", "fish", "meat", "seafood"],
}

RESTRICTION_BLOCKS = {
    "lactose": ["milk", "curd", "yogurt", "paneer", "cheese", "whey"],
    "dairy": ["milk", "curd", "yogurt", "paneer", "cheese", "whey"],
    "peanut": ["peanuts", "peanut butter"],
    "egg": ["eggs", "egg"],
    "gluten": ["wheat", "roti", "bread"],
}

SAFE_FALLBACKS = {
    "vegetarian": ["dal", "chana", "rajma", "tofu", "soy chunks", "curd", "paneer"],
    "eggetarian": ["dal", "chana", "rajma", "tofu", "soy chunks", "eggs"],
    "vegan": ["dal", "chana", "rajma", "tofu", "soy chunks", "beans"],
    "mixed": ["dal", "chana", "tofu", "eggs", "chicken", "fish"],
    "non_vegetarian": ["dal", "chana", "tofu", "eggs", "chicken", "fish"],
}


def unique(items: list[str]) -> list[str]:
    return list(dict.fromkeys(item for item in items if item))


def text_has_term(text: str, term: str) -> bool:
    normalized = text.lower()
    if term == "milk" and "plant milk" in normalized:
        normalized = normalized.replace("plant milk", "")
    return re.search(rf"\b{re.escape(term)}\b", normalized) is not None


def blocked_terms_for_request(request: AIPlanGenerateRequest) -> list[str]:
    blocked = list(DIET_DISALLOWED_TERMS.get(request.diet_type, []))
    free_text = f"{request.allergies_restrictions} {request.medical_note}".lower()
    for trigger, terms in RESTRICTION_BLOCKS.items():
        if trigger in free_text:
            blocked.extend(terms)
    if "onion" in free_text or "garlic" in free_text:
        blocked.extend(["onion", "garlic"])
    return unique(blocked)


def get_disallowed_foods(request: AIPlanGenerateRequest) -> list[str]:
    return blocked_terms_for_request(request)


def is_allowed_food(food: str, blocked_terms: list[str]) -> bool:
    return not any(text_has_term(food, term) for term in blocked_terms)


def filter_foods_by_diet_and_restrictions(
    food_pool: list[str],
    diet_preference: str,
    restrictions_text: str,
    medical_note: str,
) -> list[str]:
    request_like = type(
        "RequestLike",
        (),
        {
            "diet_type": diet_preference,
            "allergies_restrictions": restrictions_text,
            "medical_note": medical_note,
        },
    )
    blocked_terms = blocked_terms_for_request(request_like)  # type: ignore[arg-type]
    return [food for food in unique(food_pool) if is_allowed_food(food, blocked_terms)]


def protein_sources_for_diet(diet_type: str) -> list[str]:
    if diet_type == "vegetarian":
        return VEGETARIAN_PROTEIN_SOURCES
    if diet_type == "vegan":
        return VEGAN_PROTEIN_SOURCES
    if diet_type == "eggetarian":
        return EGGETARIAN_PROTEIN_SOURCES
    return NON_VEG_PROTEIN_SOURCES


def food_pool(request: AIPlanGenerateRequest) -> list[str]:
    budget_foods = {
        "low": ["oats", "rice", "dal", "chana", "peanuts", "banana", "seasonal vegetables"],
        "medium": ["paneer", "tofu", "curd", "nuts", "fruit", "rice", "roti"],
        "high": ["yogurt", "tofu", "nuts", "quinoa", "soy chunks", "fruit", "leafy greens"],
    }[request.budget]
    if request.diet_type in {"mixed", "non_vegetarian"}:
        budget_foods = unique([*budget_foods, "eggs", "chicken", "fish"])
    if request.diet_type == "eggetarian":
        budget_foods = unique([*budget_foods, "eggs"])

    foods = [
        *budget_foods,
        *protein_sources_for_diet(request.diet_type),
        *CARB_SOURCES,
        *FAT_SOURCES,
        *FRUITS_VEGETABLES,
    ]
    filtered = filter_foods_by_diet_and_restrictions(
        foods,
        request.diet_type,
        request.allergies_restrictions,
        request.medical_note,
    )
    fallback = filter_foods_by_diet_and_restrictions(
        SAFE_FALLBACKS[request.diet_type],
        request.diet_type,
        request.allergies_restrictions,
        request.medical_note,
    )
    return unique([*filtered, *fallback])


def build_food_pool(request: AIPlanGenerateRequest) -> list[str]:
    return food_pool(request)


def get_allowed_foods(request: AIPlanGenerateRequest) -> list[str]:
    return build_food_pool(request)


def generate_meal_days(request: AIPlanGenerateRequest, calories: int, macros: dict[str, int]) -> list[dict[str, Any]]:
    foods = food_pool(request)
    proteins = [food for food in protein_sources_for_diet(request.diet_type) if food in foods]
    if not proteins:
        proteins = foods[:3]
    carbs = [food for food in CARB_SOURCES if food in foods] or ["rice"]
    fats = [food for food in FAT_SOURCES if food in foods] or ["seeds"]
    plants = [food for food in FRUITS_VEGETABLES if food in foods] or ["vegetables"]
    templates = [
        ("Breakfast", [proteins[0], carbs[0], plants[0]]),
        ("Lunch", [proteins[1 % len(proteins)], carbs[1 % len(carbs)], plants[1 % len(plants)]]),
        ("Snack", [proteins[2 % len(proteins)], fats[0], "fruit" if "fruit" in foods else plants[0]]),
        ("Dinner", [proteins[3 % len(proteins)], "salad" if "salad" in foods else plants[0], carbs[2 % len(carbs)]]),
        ("Optional mini meal", [proteins[4 % len(proteins)], plants[2 % len(plants)], fats[1 % len(fats)]]),
        ("Pre-workout", ["banana" if "banana" in foods else carbs[0], "water", "light carbs"]),
    ]
    selected = templates[: request.meals_per_day]
    calories_per_meal = round(calories / request.meals_per_day)
    protein_per_meal = round(macros["protein_g"] / request.meals_per_day)
    carbs_per_meal = round(macros["carbs_g"] / request.meals_per_day)
    fats_per_meal = round(macros["fats_g"] / request.meals_per_day)
    return [
        {
            "meal": name,
            "target_calories": calories_per_meal,
            "protein_g": protein_per_meal,
            "carbs_g": carbs_per_meal,
            "fats_g": fats_per_meal,
            "foods": [item for item in items if is_allowed_food(item, blocked_terms_for_request(request))],
            "note": (
                f"Built for your {request.diet_type.replace('_', ' ')} preference, "
                f"{request.budget} budget, and {request.goal.replace('_', ' ')} target."
            ),
        }
        for name, items in selected
    ]


def meal_plan(request: AIPlanGenerateRequest, calories: int, macros: dict[str, int]) -> list[dict[str, Any]]:
    return generate_meal_days(request, calories, macros)


def micronutrient_guidance(request: AIPlanGenerateRequest) -> list[str]:
    calcium_source = "tofu, seeds, beans, or leafy greens" if request.diet_type == "vegan" else "curd, milk, tofu, or leafy greens"
    if not is_allowed_food(calcium_source, blocked_terms_for_request(request)):
        calcium_source = "tofu, legumes, seeds, or leafy greens"
    omega_source = "fish if allowed, or flax/chia/walnuts" if request.diet_type in {"mixed", "non_vegetarian"} else "flax, chia, walnuts, or other seeds"
    guidance = [
        "Fiber: include dal, beans, oats, fruits, and vegetables daily.",
        f"Calcium: use {calcium_source}.",
        "Iron: include lentils, beans, soy foods, leafy greens, and vitamin C foods.",
        "Vitamin D: get sensible sunlight exposure and discuss supplements with a professional if needed.",
        f"Omega-3: include {omega_source}.",
        "Magnesium and potassium: include legumes, nuts or seeds, fruits, and greens as tolerated.",
    ]
    if has_kidney_condition(request):
        guidance.append(
            "Kidney health: keep sodium, potassium, and phosphorus choices individualized with professional supervision.",
        )
    return sanitize_text_items(guidance, request)


def safety_notes(request: AIPlanGenerateRequest) -> list[str]:
    notes = [
        "This plan is general fitness guidance only and is not medical advice.",
        "Stop any exercise that causes sharp pain, dizziness, or unusual symptoms.",
        "Consult a qualified professional for medical conditions, injuries, or special dietary needs.",
    ]
    if has_kidney_condition(request):
        notes.append(
            "Because you mentioned chronic kidney disease, this plan is only general guidance. Please consult a doctor or registered dietitian before following high-protein or mineral-specific targets.",
        )
    restrictions = parse_restrictions(request)
    if restrictions["knee"] or restrictions["back"] or restrictions["shoulder"]:
        notes.append(
            "Because you mentioned pain or injury, keep all exercise pain-free and get clearance from a qualified professional before progressing load or range of motion.",
        )
    return notes


def sanitize_text_items(items: list[str], request: AIPlanGenerateRequest) -> list[str]:
    blocked_terms = blocked_terms_for_request(request)
    return [item for item in items if is_allowed_food(item, blocked_terms)]


def sanitize_value(value: Any, request: AIPlanGenerateRequest) -> Any:
    blocked_terms = blocked_terms_for_request(request)
    if isinstance(value, str):
        return value if is_allowed_food(value, blocked_terms) else ""
    if isinstance(value, list):
        sanitized = [sanitize_value(item, request) for item in value]
        return [item for item in sanitized if item not in ("", [], {})]
    if isinstance(value, dict):
        return {key: sanitize_value(item, request) for key, item in value.items()}
    return value


def sanitize_plan_data(plan_data: dict[str, Any], request: AIPlanGenerateRequest) -> dict[str, Any]:
    blocked_terms = blocked_terms_for_request(request)
    fallback = food_pool(request)
    for meal in plan_data["meals"]:
        meal["foods"] = [food for food in meal["foods"] if is_allowed_food(food, blocked_terms)]
        if not meal["foods"]:
            meal["foods"] = fallback[:3]
    plan_data["budget_foods"] = [food for food in plan_data["budget_foods"] if is_allowed_food(food, blocked_terms)]
    plan_data["vitamins_minerals"] = sanitize_text_items(plan_data["vitamins_minerals"], request)
    plan_data["recovery_tips"] = sanitize_text_items(plan_data["recovery_tips"], request)
    plan_data["safety_notes"] = sanitize_text_items(plan_data["safety_notes"], request)
    plan_data["personalization_reasons"] = sanitize_text_items(plan_data.get("personalization_reasons", []), request)
    return sanitize_value(plan_data, request)


def build_personalization_reasons(
    request: AIPlanGenerateRequest,
    calories: int,
    macros: dict[str, int],
    hydration: dict[str, Any],
) -> list[str]:
    location = request.workout_location.replace("_", " ")
    diet = request.diet_type.replace("_", " ")
    goal = request.goal.replace("_", " ")
    reasons = [
        (
            f"Your {calories} calorie target is based on your {request.weight_kg:g}kg weight, "
            f"{request.height_cm:g}cm height, age {request.age}, {request.activity_level} activity, "
            f"and {goal} goal."
        ),
        (
            f"Your macros use {macros['protein_g']}g protein, {macros['carbs_g']}g carbs, "
            f"and {macros['fats_g']}g fats to match the {goal} goal."
        ),
        (
            f"Your hydration target is {hydration['liters_per_day']}L/day because it combines "
            f"{request.weight_kg:g}kg body weight, {request.activity_level} activity, and "
            f"{request.workout_time_minutes}-minute workouts."
        ),
        f"Meals are {diet}-friendly and use {request.meals_per_day} meals/day because that is what you selected.",
        (
            f"Your workout schedule uses {location}-based exercise options for "
            f"{request.experience_level} experience, {request.days_per_week} training days/week, "
            f"and {request.workout_time_minutes}-minute sessions."
        ),
    ]
    if request.allergies_restrictions:
        reasons.append(f"Food choices avoid your listed restriction: {request.allergies_restrictions}.")
    if request.medical_note:
        reasons.append("Medical notes were treated conservatively and added to the safety guidance.")
    return reasons


def workout_templates(request: AIPlanGenerateRequest) -> tuple[list[dict[str, Any]], int, str]:
    gym = request.workout_location in {"gym", "mixed"}
    beginner = request.experience_level == "beginner"
    advanced = request.experience_level == "advanced"
    bodyweight = not gym or "bodyweight" in request.equipment.lower() or not request.equipment
    if bodyweight:
        push = ["Incline push-up", "Push-up", "Chair dips"] if beginner else ["Push-up", "Pike push-up", "Tempo chair dips"]
        pull = ["Prone Y raise", "Towel row", "Reverse snow angel"] if beginner else ["Towel row", "Band row", "Reverse snow angel"]
        legs = ["Squat", "Reverse lunge", "Glute bridge"] if beginner else ["Split squat", "Reverse lunge", "Single-leg glute bridge"]
    else:
        push = ["Machine chest press", "Dumbbell shoulder press", "Cable triceps pressdown"] if beginner else ["Bench press", "Dumbbell shoulder press", "Cable triceps pressdown"]
        pull = ["Lat pulldown", "Seated row", "Dumbbell curl"]
        legs = ["Leg press", "Romanian deadlift", "Goblet squat"]

    full_body = [
        "Squat" if bodyweight else "Goblet squat",
        "Incline push-up" if bodyweight and beginner else "Push-up" if bodyweight else "Dumbbell press",
        "Row variation" if bodyweight else "Cable row",
        "Plank",
    ]
    sets = 2 if beginner else 3 if request.experience_level == "intermediate" else 4
    reps = "8-10" if request.goal == "strength" else "10-15"

    if advanced:
        templates = [
            {"name": "Lower Strength", "exercises": [*legs, "Loaded carry" if gym else "Bear crawl"]},
            {"name": "Upper Push", "exercises": [*push, "Core anti-rotation"]},
            {"name": "Upper Pull", "exercises": [*pull, "Face pull/band pull-apart"]},
            {"name": "Lower Hypertrophy", "exercises": [*legs, "Calf raise", "Plank"]},
            {"name": "Conditioning + Core", "exercises": ["Brisk walk intervals", "Mountain climber", "Mobility flow"]},
            {"name": "Full Body Progressive Overload", "exercises": [*full_body, "Farmer carry" if gym else "Bear crawl"]},
            {"name": "Mobility", "exercises": ["Hip flexor stretch", "Thoracic rotation", "Hamstring stretch"]},
        ]
    else:
        templates = [
            {"name": "Full Body", "exercises": full_body},
            {"name": "Push + Core", "exercises": [*push, "Dead bug", "Side plank"]},
            {"name": "Pull + Posture", "exercises": [*pull, "Face pull/band pull-apart"]},
            {"name": "Lower Body", "exercises": [*legs, "Calf raise", "Plank"]},
            {"name": "Conditioning", "exercises": ["Brisk walk", "Mountain climber", "Mobility flow"]},
            {"name": "Weak Point Full Body", "exercises": [*full_body, "Farmer carry" if gym else "Bear crawl"]},
            {"name": "Mobility", "exercises": ["Hip flexor stretch", "Thoracic rotation", "Hamstring stretch"]},
        ]
    return templates, sets, reps


def adapt_exercises_for_injuries(exercises: list[str], request: AIPlanGenerateRequest) -> list[str]:
    restrictions = parse_restrictions(request)
    replacements = {
        "knee": {
            "Reverse lunge": "Supported step-back reach",
            "Split squat": "Box squat to comfortable depth",
            "Goblet squat": "Leg press light range",
            "Squat": "Box squat to comfortable depth",
            "Mountain climber": "Marching in place",
            "Brisk walk intervals": "Easy walk intervals",
        },
        "back": {
            "Romanian deadlift": "Hip hinge drill",
            "Bear crawl": "Dead bug",
            "Loaded carry": "Pallof press",
            "Farmer carry": "Pallof press",
            "Mountain climber": "Dead bug",
        },
        "shoulder": {
            "Pike push-up": "Wall push-up",
            "Dumbbell shoulder press": "Landmine press light",
            "Machine chest press": "Incline wall push-up",
            "Bench press": "Machine chest press light",
            "Chair dips": "Triceps band pressdown",
            "Tempo chair dips": "Triceps band pressdown",
        },
    }
    adapted = exercises[:]
    for injury_key, injury_replacements in replacements.items():
        if not restrictions[injury_key]:
            continue
        adapted = [injury_replacements.get(exercise, exercise) for exercise in adapted]
    return unique(adapted)


def generate_workout_days(request: AIPlanGenerateRequest) -> list[dict[str, Any]]:
    templates, sets, reps = workout_templates(request)
    active_days = set(round(1 + index * 6 / max(1, request.days_per_week - 1)) for index in range(request.days_per_week))
    days: list[dict[str, Any]] = []
    for day in range(1, request.duration_days + 1):
        week_day = ((day - 1) % 7) + 1
        if week_day not in active_days:
            days.append(
                {
                    "day": day,
                    "title": "Recovery / Mobility",
                    "type": "recovery",
                    "duration_minutes": min(30, request.workout_time_minutes),
                    "exercises": [
                        {"name": "Easy walk", "sets": 1, "reps": "20-30 min", "rest_seconds": 0, "note": "Keep it conversational."},
                        {"name": "Mobility flow", "sets": 1, "reps": "8-10 min", "rest_seconds": 0, "note": "Move pain-free."},
                    ],
                },
            )
            continue
        template = templates[(ceil(day / 2) - 1) % len(templates)]
        adapted_exercises = adapt_exercises_for_injuries(template["exercises"], request)
        days.append(
            {
                "day": day,
                "title": template["name"],
                "type": "training",
                "duration_minutes": request.workout_time_minutes,
                "exercises": [
                    {
                        "name": "Warm-up",
                        "sets": 1,
                        "reps": "5-8 min",
                        "rest_seconds": 0,
                        "note": "Easy cardio plus joint circles before the main work.",
                    },
                ]
                + [
                    {
                        "name": exercise,
                        "sets": sets,
                        "reps": reps,
                        "rest_seconds": 90 if request.goal == "strength" else 60,
                        "note": "Use controlled form and add reps or load gradually when all sets feel solid.",
                    }
                    for exercise in adapted_exercises
                ]
                + [
                    {
                        "name": "Cooldown",
                        "sets": 1,
                        "reps": "5 min",
                        "rest_seconds": 0,
                        "note": "Slow breathing and light stretching within a pain-free range.",
                    },
                ],
            },
        )
    return days


def workout_plan(request: AIPlanGenerateRequest) -> list[dict[str, Any]]:
    return generate_workout_days(request)


def generate_rule_based_plan(request: AIPlanGenerateRequest) -> dict[str, Any]:
    bmr = calculate_bmr(request)
    tdee = calculate_tdee(bmr, request.activity_level)
    calories = calculate_calorie_target(tdee, request.goal)
    macros = calculate_macros(calories, request.weight_kg, request.goal, has_kidney_condition(request))
    hydration = calculate_hydration(request)
    foods = build_food_pool(request)
    plan_data = {
        "summary": {
            "goal": request.goal,
            "bmr": round(bmr),
            "tdee": round(tdee),
            "calories_per_day": calories,
            "duration_days": request.duration_days,
            "budget": request.budget,
            "calorie_note": (
                f"BMR estimated with Mifflin-St Jeor, then adjusted for {request.activity_level} activity "
                f"and your {request.goal.replace('_', ' ')} goal."
            ),
        },
        "macros": macros,
        "hydration": hydration,
        "meals": generate_meal_days(request, calories, macros),
        "budget_foods": foods[:12],
        "vitamins_minerals": micronutrient_guidance(request),
        "workouts": generate_workout_days(request),
        "recovery_tips": [
            f"Sleep 7-9 hours where possible to support {request.goal.replace('_', ' ')} progress.",
            f"Keep recovery days easy because your plan already schedules {request.days_per_week} training days per week.",
            f"Progress gradually during {request.workout_time_minutes}-minute sessions when sets feel controlled.",
        ],
        "safety_notes": safety_notes(request),
        "personalization_reasons": build_personalization_reasons(request, calories, macros, hydration),
    }
    return sanitize_plan_data(plan_data, request)
