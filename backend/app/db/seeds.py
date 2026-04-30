import logging

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.repositories.auth_repository import AuthUserRepository
from app.repositories.food_repository import FoodRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.video_repository import ExerciseVideoRepository
from app.schemas.subscription import SubscriptionPlanCreate
from app.schemas.video import ExerciseVideoCreate

logger = logging.getLogger(__name__)


DEFAULT_SUBSCRIPTION_PLANS: list[dict[str, object]] = [
    {
        "name": "Free",
        "price": 0,
        "duration_days": 0,
        "features": ["Access basic videos only"],
        "is_active": True,
    },
    {
        "name": "Pro Monthly",
        "price": 299,
        "duration_days": 30,
        "features": ["Access premium videos"],
        "is_active": True,
    },
    {
        "name": "Premium Monthly",
        "price": 599,
        "duration_days": 30,
        "features": [
            "Access premium videos",
            "AI coaching",
            "Nutrition tracking",
        ],
        "is_active": True,
    },
]

DEFAULT_DEMO_AUTH_USERS: list[dict[str, object]] = [
    {
        "age": 24,
        "email": "user@fitcoach.local",
        "experience_level": "beginner",
        "fitness_goal": "general_fitness",
        "height_cm": 175.0,
        "is_verified": True,
        "name": "Demo User",
        "password": "User@123",
        "role": "user",
        "weight_kg": 72.0,
    },
    {
        "age": None,
        "email": "admin@fitcoach.local",
        "experience_level": None,
        "fitness_goal": None,
        "height_cm": None,
        "is_verified": True,
        "name": "Demo Admin",
        "password": "Admin@123",
        "role": "admin",
        "weight_kg": None,
    },
]

DEFAULT_EXERCISE_VIDEOS: list[dict[str, object]] = [
    {
        "title": "Squat Fundamentals",
        "description": "Bodyweight squat technique with steady depth and posture.",
        "category": "Strength",
        "difficulty": "beginner",
        "duration_minutes": 8,
        "target_muscles": ["Quads", "Glutes", "Core"],
        "equipment": "Bodyweight",
        "video_url": "/videos/squat.mp4",
        "thumbnail_url": "",
        "is_premium": False,
        "is_active": True,
    },
    {
        "title": "Push-up Form Builder",
        "description": "Controlled push-up practice for chest, arms, and body line.",
        "category": "Strength",
        "difficulty": "beginner",
        "duration_minutes": 9,
        "target_muscles": ["Chest", "Triceps", "Core"],
        "equipment": "Bodyweight",
        "video_url": "/videos/push-up.mp4",
        "thumbnail_url": "",
        "is_premium": False,
        "is_active": True,
    },
    {
        "title": "Crunch Control",
        "description": "Core-focused crunch session with smooth range of motion.",
        "category": "Core",
        "difficulty": "beginner",
        "duration_minutes": 7,
        "target_muscles": ["Abs", "Core"],
        "equipment": "Mat",
        "video_url": "/videos/crunch.mp4",
        "thumbnail_url": "",
        "is_premium": False,
        "is_active": True,
    },
    {
        "title": "Bicep Curl Basics",
        "description": "Arm curl technique with elbow control and full extension.",
        "category": "Strength",
        "difficulty": "beginner",
        "duration_minutes": 10,
        "target_muscles": ["Biceps", "Forearms"],
        "equipment": "Dumbbells",
        "video_url": "/videos/bicep-curl.mp4",
        "thumbnail_url": "",
        "is_premium": True,
        "is_active": True,
    },
    {
        "title": "Plank Stability",
        "description": "Static core hold for posture, bracing, and endurance.",
        "category": "Core",
        "difficulty": "intermediate",
        "duration_minutes": 6,
        "target_muscles": ["Core", "Shoulders"],
        "equipment": "Mat",
        "video_url": "/videos/plank.mp4",
        "thumbnail_url": "",
        "is_premium": True,
        "is_active": True,
    },
    {
        "title": "Jumping Jacks Cardio",
        "description": "Simple full-body cardio warmup with rhythmic movement.",
        "category": "Cardio",
        "difficulty": "beginner",
        "duration_minutes": 5,
        "target_muscles": ["Full Body"],
        "equipment": "Bodyweight",
        "video_url": "/videos/jumping-jacks.mp4",
        "thumbnail_url": "",
        "is_premium": False,
        "is_active": True,
    },
]


def food(
    name: str,
    serving_unit: str,
    calories_per_serving: float,
    protein_g: float,
    carbs_g: float,
    fats_g: float,
    aliases: list[str] | None = None,
) -> dict[str, object]:
    alias_values = aliases or [name]
    return {
        "aliases": ",".join(dict.fromkeys(alias_values)),
        "name": name,
        "serving_unit": serving_unit,
        "calories_per_serving": calories_per_serving,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fats_g": fats_g,
        "is_custom": False,
    }


COMMON_FOOD_ITEMS: list[dict[str, object]] = [
    food("apple", "1 medium", 95.0, 0.5, 25.0, 0.3),
    food("banana", "1 medium", 105.0, 1.3, 27.0, 0.4),
    food("orange", "1 medium", 62.0, 1.2, 15.4, 0.2),
    food("mango", "1 cup sliced", 99.0, 1.4, 25.0, 0.6),
    food("grapes", "1 cup", 104.0, 1.1, 27.0, 0.2),
    food("watermelon", "1 cup diced", 46.0, 0.9, 11.5, 0.2),
    food("papaya", "1 cup diced", 62.0, 0.7, 15.7, 0.4),
    food("pineapple", "1 cup chunks", 82.0, 0.9, 21.6, 0.2),
    food("strawberry", "1 cup halves", 49.0, 1.0, 11.7, 0.5),
    food("dates", "2 pieces", 133.0, 1.0, 36.0, 0.1),
    food("lemon", "1 medium", 17.0, 0.6, 5.4, 0.2),
    food("pear", "1 medium", 101.0, 0.6, 27.0, 0.3),
    food("pomegranate", "1/2 cup arils", 72.0, 1.5, 16.0, 1.0),
    food("guava", "1 medium", 68.0, 2.6, 14.0, 1.0),
    food("kiwi", "1 medium", 42.0, 0.8, 10.0, 0.4),
    food("blueberries", "1 cup", 84.0, 1.1, 21.0, 0.5),
    food("rice", "1 cup cooked", 205.0, 4.3, 45.0, 0.4),
    food("brown rice", "1 cup cooked", 216.0, 5.0, 45.0, 1.8),
    food("basmati rice", "1 cup cooked", 210.0, 4.4, 46.0, 0.5),
    food("roti", "1 medium", 120.0, 3.5, 18.0, 3.0),
    food("chapati", "1 medium", 110.0, 3.0, 18.0, 2.5),
    food("paratha", "1 medium", 220.0, 5.0, 30.0, 9.0),
    food("naan", "1 piece", 260.0, 8.0, 45.0, 6.0),
    food("bread", "1 slice", 80.0, 3.0, 14.0, 1.0),
    food("whole wheat bread", "1 slice", 75.0, 3.6, 13.0, 1.1),
    food("oats", "1/2 cup dry", 150.0, 5.0, 27.0, 3.0),
    food("poha", "1 cup cooked", 180.0, 3.5, 35.0, 3.5),
    food("upma", "1 cup cooked", 220.0, 6.0, 36.0, 6.0),
    food("idli", "2 pieces", 116.0, 4.0, 24.0, 0.8),
    food("dosa", "1 medium", 165.0, 4.0, 28.0, 4.0),
    food("pasta", "1 cup cooked", 220.0, 8.0, 43.0, 1.3),
    food("noodles", "1 cup cooked", 220.0, 7.0, 40.0, 4.0),
    food("potato", "1 medium boiled", 161.0, 4.3, 37.0, 0.2),
    food("sweet potato", "1 medium", 112.0, 2.0, 26.0, 0.1),
    food("quinoa", "1 cup cooked", 222.0, 8.1, 39.0, 3.6),
    food("corn", "1 cup", 132.0, 5.0, 29.0, 1.8),
    food("egg", "1 large", 78.0, 6.0, 0.6, 5.0),
    food("boiled egg", "1 large", 78.0, 6.0, 0.6, 5.0),
    food("egg white", "3 large whites", 51.0, 10.8, 0.7, 0.2),
    food("paneer", "100 g", 265.0, 18.0, 1.2, 20.0),
    food("tofu", "100 g", 144.0, 17.0, 3.0, 9.0),
    food("chicken breast", "100 g cooked", 165.0, 31.0, 0.0, 3.6),
    food("chicken curry", "1 cup", 280.0, 25.0, 8.0, 16.0),
    food("fish", "100 g cooked", 206.0, 22.0, 0.0, 12.0),
    food("tuna", "100 g", 132.0, 28.0, 0.0, 1.0),
    food("dal", "1 cup cooked", 198.0, 12.0, 30.0, 4.0),
    food("chickpeas", "1 cup cooked", 269.0, 14.5, 45.0, 4.2),
    food("rajma", "1 cup cooked", 225.0, 15.0, 40.0, 1.0),
    food("sprouts", "1 cup", 80.0, 8.0, 16.0, 1.0),
    food("soy chunks", "50 g dry", 172.0, 26.0, 16.0, 0.5),
    food("whey protein", "1 scoop", 120.0, 24.0, 3.0, 1.5),
    food("greek yogurt", "1 cup", 130.0, 20.0, 9.0, 0.7),
    food("curd", "1 cup", 150.0, 8.5, 11.0, 8.0),
    food("milk", "1 cup", 149.0, 7.7, 12.0, 8.0),
    food("lentils", "1 cup cooked", 230.0, 18.0, 40.0, 0.8),
    food("kidney beans", "1 cup cooked", 225.0, 15.0, 40.0, 1.0),
    food("black beans", "1 cup cooked", 227.0, 15.0, 41.0, 0.9),
    food("mutton curry", "1 cup", 350.0, 25.0, 8.0, 24.0),
    food("almonds", "28 g", 164.0, 6.0, 6.0, 14.0),
    food("peanuts", "28 g", 161.0, 7.3, 4.6, 14.0),
    food("peanut butter", "2 tbsp", 190.0, 7.0, 7.0, 16.0),
    food("cashews", "28 g", 157.0, 5.2, 8.6, 12.0),
    food("walnuts", "28 g", 185.0, 4.3, 3.9, 18.5),
    food("cheese", "28 g", 113.0, 7.0, 0.4, 9.0),
    food("avocado", "1/2 medium", 120.0, 1.5, 6.0, 11.0),
    food("chia seeds", "2 tbsp", 138.0, 4.7, 12.0, 8.7),
    food("flax seeds", "2 tbsp", 110.0, 3.8, 6.0, 8.6),
    food("pumpkin seeds", "28 g", 151.0, 7.0, 5.0, 13.0),
    food("pizza", "1 slice", 285.0, 12.0, 36.0, 10.0),
    food("burger", "1 burger", 354.0, 17.0, 33.0, 17.0),
    food("sandwich", "1 sandwich", 300.0, 14.0, 38.0, 10.0),
    food("biryani", "1 cup", 290.0, 12.0, 38.0, 10.0),
    food("pulao", "1 cup", 260.0, 6.0, 45.0, 7.0),
    food("fried rice", "1 cup", 333.0, 8.0, 42.0, 14.0),
    food("maggi", "1 pack cooked", 310.0, 7.0, 45.0, 11.0),
    food("samosa", "1 piece", 262.0, 4.0, 32.0, 14.0),
    food("momos", "6 pieces", 280.0, 10.0, 38.0, 9.0),
    food("pav bhaji", "1 plate", 400.0, 10.0, 58.0, 14.0),
    food("chole bhature", "1 plate", 650.0, 18.0, 88.0, 24.0),
    food("salad", "1 bowl", 70.0, 3.0, 12.0, 1.0),
    food("broccoli", "1 cup cooked", 55.0, 3.7, 11.0, 0.6),
    food("spinach", "1 cup cooked", 41.0, 5.3, 6.8, 0.5),
    food("carrot", "1 medium", 25.0, 0.6, 6.0, 0.1),
    food("cucumber", "1 cup sliced", 16.0, 0.7, 3.8, 0.1),
    food("tomato", "1 medium", 22.0, 1.1, 4.8, 0.2),
    food("cauliflower", "1 cup cooked", 29.0, 2.3, 5.0, 0.6),
    food("green peas", "1 cup cooked", 134.0, 8.6, 25.0, 0.4),
    food("beans", "1 cup cooked", 44.0, 2.4, 10.0, 0.4),
    food("mushroom", "1 cup cooked", 44.0, 3.4, 8.0, 0.7),
    food("capsicum", "1 cup sliced", 24.0, 1.0, 5.5, 0.2),
    food("onion", "1 medium", 44.0, 1.2, 10.0, 0.1),
    food("beetroot", "1 cup cooked", 75.0, 2.9, 17.0, 0.3),
    food("coffee", "1 cup black", 2.0, 0.3, 0.0, 0.0),
    food("tea", "1 cup with milk", 80.0, 3.0, 10.0, 3.0),
    food("fruit smoothie", "1 glass", 220.0, 6.0, 42.0, 3.0),
    food("white rice", "1 cup cooked", 205.0, 4.2, 45.0, 0.4),
    food("jeera rice", "1 cup", 240.0, 4.5, 43.0, 6.0),
    food("lemon rice", "1 cup", 250.0, 5.0, 42.0, 8.0),
    food("curd rice", "1 cup", 210.0, 6.0, 36.0, 5.0),
    food("khichdi", "1 cup", 220.0, 8.0, 38.0, 4.5),
    food("sambar", "1 cup", 150.0, 7.0, 22.0, 4.0),
    food("rasam", "1 cup", 70.0, 2.5, 12.0, 2.0),
    food("uttapam", "1 medium", 220.0, 6.0, 36.0, 6.0),
    food("vada", "1 piece", 135.0, 4.0, 14.0, 7.0),
    food("medu vada", "1 piece", 135.0, 4.0, 14.0, 7.0),
    food("egg bhurji", "1 cup", 220.0, 14.0, 5.0, 16.0),
    food("omelette", "2 eggs", 180.0, 12.0, 2.0, 14.0),
    food("scrambled eggs", "2 eggs", 200.0, 13.0, 2.0, 15.0),
    food("paneer tikka", "100 g", 285.0, 18.0, 6.0, 21.0),
    food("palak paneer", "1 cup", 280.0, 14.0, 12.0, 20.0),
    food("kadai paneer", "1 cup", 330.0, 16.0, 14.0, 24.0),
    food("vegetable curry", "1 cup", 160.0, 4.0, 20.0, 7.0),
    food("mixed vegetable sabzi", "1 cup", 140.0, 4.0, 18.0, 6.0),
    food("mixed vegetables", "1 cup cooked", 90.0, 4.0, 18.0, 1.0),
    food("aloo gobi", "1 cup", 180.0, 5.0, 28.0, 6.0),
    food("bhindi", "1 cup cooked", 120.0, 3.0, 14.0, 6.0),
    food("okra", "1 cup cooked", 120.0, 3.0, 14.0, 6.0),
    food("baingan bharta", "1 cup", 150.0, 3.0, 18.0, 8.0),
    food("cabbage sabzi", "1 cup", 95.0, 3.0, 12.0, 4.0),
    food("lauki sabzi", "1 cup", 90.0, 2.0, 12.0, 4.0),
    food("karela sabzi", "1 cup", 110.0, 3.0, 14.0, 5.0),
    food("chana masala", "1 cup", 280.0, 13.0, 40.0, 8.0),
    food("chana dal", "1 cup cooked", 230.0, 13.0, 35.0, 5.0),
    food("chole", "1 cup", 280.0, 13.0, 40.0, 8.0),
    food("rajma curry", "1 cup", 250.0, 14.0, 42.0, 4.0),
    food("moong dal", "1 cup cooked", 180.0, 12.0, 28.0, 3.0),
    food("toor dal", "1 cup cooked", 200.0, 12.0, 32.0, 4.0),
    food("masoor dal", "1 cup cooked", 190.0, 13.0, 30.0, 3.5),
    food("dal makhani", "1 cup", 320.0, 14.0, 34.0, 16.0),
    food("hummus", "2 tbsp", 70.0, 2.0, 5.0, 5.0),
    food("protein bar", "1 bar", 210.0, 20.0, 23.0, 7.0),
    food("protein shake", "1 glass", 180.0, 25.0, 10.0, 4.0),
    food("lassi", "1 glass", 220.0, 8.0, 35.0, 6.0),
    food("buttermilk", "1 glass", 50.0, 3.0, 5.0, 2.0),
    food("coconut water", "1 cup", 45.0, 0.5, 11.0, 0.0),
    food("orange juice", "1 cup", 112.0, 1.7, 26.0, 0.5),
    food("sugarcane juice", "1 glass", 180.0, 0.0, 45.0, 0.0),
    food("cola", "1 can", 140.0, 0.0, 39.0, 0.0),
    food("energy drink", "1 can", 110.0, 0.0, 28.0, 0.0),
    food("coconut", "1/2 cup grated", 142.0, 1.4, 6.8, 13.0),
    food("raisins", "28 g", 85.0, 0.9, 22.0, 0.1),
    food("figs", "2 dried", 95.0, 1.0, 25.0, 0.4),
    food("peach", "1 medium", 59.0, 1.4, 14.0, 0.4),
    food("plum", "1 medium", 30.0, 0.5, 7.5, 0.2),
    food("cherry", "1 cup", 87.0, 1.5, 22.0, 0.3),
    food("muskmelon", "1 cup diced", 54.0, 1.3, 13.0, 0.3),
    food("lychee", "1 cup", 125.0, 1.6, 31.0, 0.8),
    food("dragon fruit", "1 cup", 103.0, 2.0, 22.0, 0.6),
    food("jamun", "1 cup", 75.0, 1.0, 18.0, 0.2),
    food("custard apple", "1 fruit", 235.0, 5.0, 59.0, 0.7),
    food("protein oats", "1 bowl", 320.0, 24.0, 42.0, 8.0),
    food("muesli", "1 cup", 289.0, 8.0, 55.0, 5.0),
    food("granola", "1/2 cup", 226.0, 5.0, 37.0, 7.0),
    food("cornflakes", "1 cup", 100.0, 2.0, 24.0, 0.1),
    food("pancake", "2 medium", 175.0, 5.0, 28.0, 5.0),
    food("french toast", "2 slices", 300.0, 12.0, 32.0, 14.0),
    food("wrap", "1 wrap", 350.0, 18.0, 42.0, 12.0),
    food("burrito", "1 burrito", 450.0, 20.0, 58.0, 16.0),
    food("taco", "1 taco", 170.0, 9.0, 18.0, 8.0),
    food("french fries", "1 medium serving", 365.0, 4.0, 48.0, 17.0),
    food("pakora", "4 pieces", 280.0, 7.0, 30.0, 15.0),
    food("dhokla", "4 pieces", 160.0, 6.0, 28.0, 3.0),
    food("khandvi", "4 pieces", 180.0, 7.0, 20.0, 8.0),
    food("sev", "28 g", 160.0, 5.0, 16.0, 9.0),
    food("namkeen", "30 g", 170.0, 5.0, 18.0, 10.0),
    food("chips", "28 g", 152.0, 2.0, 15.0, 10.0),
    food("popcorn", "3 cups air-popped", 93.0, 3.0, 18.0, 1.1),
    food("dark chocolate", "28 g", 170.0, 2.0, 13.0, 12.0),
    food("ice cream", "1/2 cup", 137.0, 2.3, 16.0, 7.0),
    food("kheer", "1 bowl", 260.0, 7.0, 42.0, 8.0),
    food("gulab jamun", "1 piece", 150.0, 2.0, 24.0, 6.0),
    food("rasgulla", "1 piece", 125.0, 3.0, 28.0, 0.5),
    food("jalebi", "2 pieces", 300.0, 3.0, 58.0, 8.0),
    food("chicken tikka", "100 g", 190.0, 28.0, 4.0, 7.0),
    food("grilled chicken", "100 g", 170.0, 31.0, 0.0, 4.0),
    food("mutton biryani", "1 cup", 350.0, 18.0, 38.0, 15.0),
    food("prawn curry", "1 cup", 240.0, 24.0, 8.0, 12.0),
    food("salmon", "100 g cooked", 208.0, 20.0, 0.0, 13.0),
    food("shrimp", "100 g cooked", 99.0, 24.0, 0.2, 0.3),
    food("cottage cheese", "100 g", 98.0, 11.0, 3.4, 4.3),
    food("mozzarella", "28 g", 85.0, 6.0, 1.0, 6.0),
    food("butter", "1 tbsp", 102.0, 0.1, 0.0, 11.5),
    food("ghee", "1 tbsp", 120.0, 0.0, 0.0, 14.0),
    food("olive oil", "1 tbsp", 119.0, 0.0, 0.0, 13.5),
]

FOOD_ALIAS_OVERRIDES: dict[str, list[str]] = {
    "banana": ["banana", "kela"],
    "egg": ["egg", "anda"],
    "boiled egg": ["boiled egg", "anda"],
    "curd": ["curd", "dahi", "yogurt"],
    "milk": ["milk", "doodh"],
    "roti": ["roti", "chapati", "phulka"],
    "chapati": ["chapati", "roti", "phulka"],
    "rice": ["rice", "chawal", "white rice"],
    "white rice": ["white rice", "rice", "chawal"],
    "brown rice": ["brown rice", "rice"],
    "fried rice": ["fried rice", "rice"],
    "biryani": ["biryani", "rice"],
    "chicken breast": ["chicken breast", "chicken"],
    "chicken curry": ["chicken curry", "chicken"],
    "paneer": ["paneer", "cottage cheese"],
    "chickpeas": ["chickpeas", "chana"],
    "chole": ["chole", "chana"],
    "rajma": ["rajma", "kidney beans"],
    "tea": ["tea", "chai"],
    "peanuts": ["peanuts", "groundnut"],
    "mixed vegetables": ["mixed vegetables", "sabzi", "vegetables"],
}

for food_item in COMMON_FOOD_ITEMS:
    name = str(food_item["name"])
    aliases = FOOD_ALIAS_OVERRIDES.get(name, [name])
    food_item["aliases"] = ",".join(dict.fromkeys(aliases))


def seed_food_items(db: Session) -> None:
    FoodRepository(db).create_many_if_missing(COMMON_FOOD_ITEMS)


def seed_subscription_plans(db: Session) -> None:
    repository = SubscriptionRepository(db)
    for plan_data in DEFAULT_SUBSCRIPTION_PLANS:
        name = str(plan_data["name"])
        if repository.get_plan_by_name(name) is None:
            repository.create_plan(SubscriptionPlanCreate(**plan_data))


def seed_exercise_videos(db: Session) -> None:
    repository = ExerciseVideoRepository(db)
    for video_data in DEFAULT_EXERCISE_VIDEOS:
        title = str(video_data["title"])
        if repository.get_by_title(title) is None:
            repository.create(ExerciseVideoCreate(**video_data))


def auth_seed_users() -> list[dict[str, object]]:
    settings = get_settings()
    users = [dict(user_data) for user_data in DEFAULT_DEMO_AUTH_USERS] if settings.dev_mode else []
    return users


def seed_environment_admin(db: Session) -> None:
    settings = get_settings()
    admin_email = settings.admin_email.strip().lower()
    admin_password = settings.admin_password
    if not admin_email or not admin_password:
        return

    repository = AuthUserRepository(db)
    existing_user = repository.get_by_email(admin_email)
    if existing_user is not None:
        update_values: dict[str, object] = {}
        if existing_user.role != "admin":
            update_values["role"] = "admin"
        if not existing_user.is_verified:
            update_values["is_verified"] = True
        if settings.admin_force_reset and not verify_password(
            admin_password,
            existing_user.password_hash,
        ):
            update_values["password_hash"] = hash_password(admin_password)
        if update_values:
            repository.update(existing_user, update_values)
    else:
        repository.create(
            {
                "age": None,
                "email": admin_email,
                "experience_level": None,
                "fitness_goal": None,
                "height_cm": None,
                "is_verified": True,
                "name": "Project Admin",
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "weight_kg": None,
            },
        )

    logger.info("Admin account ready: %s", admin_email)


def seed_auth_users(db: Session) -> None:
    repository = AuthUserRepository(db)
    profile_repository = ProfileRepository(db)
    for user_data in auth_seed_users():
        email = str(user_data["email"])
        existing_user = repository.get_by_email(email)
        user_values = {
            key: value
            for key, value in {
                **user_data,
                "password_hash": hash_password(str(user_data["password"])),
            }.items()
            if key != "password"
        }
        if existing_user is not None:
            user = repository.update(existing_user, user_values)
        else:
            user = repository.create(user_values)

        if user.role == "user":
            profile_repository.create_default_for_auth_user(
                profile_id=user.id,
                name=user.name,
                age=user.age,
                height_cm=user.height_cm,
                weight_kg=user.weight_kg,
                fitness_goal=user.fitness_goal,
                experience_level=user.experience_level,
            )
    seed_environment_admin(db)
