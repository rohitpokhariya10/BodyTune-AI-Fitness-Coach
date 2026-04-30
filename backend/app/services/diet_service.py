import re
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import get_settings
from app.models.diet_log import DietLog
from app.models.food_item import FoodItem
from app.models.meal_photo import MealPhoto
from app.repositories.diet_log_repository import DietLogRepository
from app.repositories.food_repository import FoodRepository
from app.repositories.meal_photo_repository import MealPhotoRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.diet import DietLogCreate, DietLogRead, DietMealGroups, DietSummary, MealType

settings = get_settings()

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
}

IMAGE_SIGNATURES: dict[str, bytes | tuple[bytes, ...]] = {
    ".gif": (b"GIF87a", b"GIF89a"),
    ".jpg": b"\xff\xd8\xff",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".webp": b"RIFF",
}

SUGGESTION_KEYWORD_TO_FOOD_NAME: dict[str, str] = {
    "apple": "apple",
    "banana": "banana",
    "chicken": "chicken breast",
    "curd": "curd",
    "dal": "dal",
    "egg": "egg",
    "fish": "fish",
    "milk": "milk",
    "oats": "oats",
    "paneer": "paneer",
    "rice": "rice",
    "roti": "roti",
    "salad": "salad",
    "tofu": "tofu",
}

FALLBACK_SUGGESTION_FOOD_NAMES = ["rice", "roti", "dal", "banana", "egg"]
SUGGESTION_RESPONSE_MESSAGE = (
    "Confirm suggested foods and serving quantity for accurate nutrition."
)


class DietUserNotFoundError(Exception):
    def __init__(self, user_id: int) -> None:
        self.user_id = user_id
        super().__init__(f"User profile with id {user_id} was not found")


class FoodItemNotFoundError(Exception):
    def __init__(self, food_item_id: int) -> None:
        self.food_item_id = food_item_id
        super().__init__(f"Food item with id {food_item_id} was not found")


class DietLogNotFoundError(Exception):
    def __init__(self, log_id: int) -> None:
        self.log_id = log_id
        super().__init__(f"Diet log with id {log_id} was not found")


class MealPhotoNotFoundError(Exception):
    def __init__(self, photo_id: int) -> None:
        self.photo_id = photo_id
        super().__init__(f"Meal photo with id {photo_id} was not found")


class MealPhotoUserMismatchError(Exception):
    def __init__(self, photo_id: int, user_id: int) -> None:
        self.photo_id = photo_id
        self.user_id = user_id
        super().__init__(
            f"Meal photo with id {photo_id} does not belong to user {user_id}",
        )


class InvalidMealPhotoError(Exception):
    pass


class MealPhotoTooLargeError(Exception):
    def __init__(self, max_bytes: int) -> None:
        self.max_bytes = max_bytes
        super().__init__(f"Meal photo must be {max_bytes} bytes or smaller")


class DietService:
    def __init__(
        self,
        *,
        diet_log_repository: DietLogRepository,
        food_repository: FoodRepository,
        meal_photo_repository: MealPhotoRepository,
        profile_repository: ProfileRepository,
    ) -> None:
        self.diet_log_repository = diet_log_repository
        self.food_repository = food_repository
        self.meal_photo_repository = meal_photo_repository
        self.profile_repository = profile_repository

    def list_foods(self) -> list[FoodItem]:
        return self.food_repository.list_all()

    def search_foods(self, query: str) -> list[FoodItem]:
        return self.food_repository.search(query)

    def suggest_foods_for_photo(self, photo_id: int) -> list[FoodItem]:
        meal_photo = self.meal_photo_repository.get_by_id(photo_id)
        if meal_photo is None:
            raise MealPhotoNotFoundError(photo_id)

        return self.suggest_foods_from_photo_filename(meal_photo.original_filename)

    def suggest_foods_from_photo_filename(self, filename: str) -> list[FoodItem]:
        suggested_names = suggest_food_names_from_photo_filename(filename)
        suggestions: list[FoodItem] = []

        for food_name in suggested_names:
            food_item = self.food_repository.get_by_name(food_name)
            if food_item is not None:
                suggestions.append(food_item)

        return suggestions

    async def upload_meal_photo(
        self,
        *,
        file: UploadFile,
        meal_type: MealType,
        user_id: int,
    ) -> MealPhoto:
        self._ensure_user_exists(user_id)
        _ = meal_type

        image_bytes = await file.read()
        if len(image_bytes) > settings.meal_photo_max_bytes:
            raise MealPhotoTooLargeError(settings.meal_photo_max_bytes)

        extension = self._validate_image_upload(file, image_bytes)
        settings.meal_photo_upload_dir.mkdir(parents=True, exist_ok=True)

        original_filename = Path(file.filename or "meal-photo").name
        stored_filename = f"{uuid4().hex}{extension}"
        stored_path = settings.meal_photo_upload_dir / stored_filename
        stored_path.write_bytes(image_bytes)

        relative_path = f"uploads/meal_photos/{stored_filename}"
        return self.meal_photo_repository.create(
            image_path=relative_path,
            original_filename=original_filename,
            user_id=user_id,
        )

    def create_diet_log(self, log_data: DietLogCreate) -> DietLog:
        self._ensure_user_exists(log_data.user_id)
        if log_data.food_item_id is not None:
            food_item = self.food_repository.get_by_id(log_data.food_item_id)
            if food_item is None:
                raise FoodItemNotFoundError(log_data.food_item_id)
        elif log_data.custom_food is not None:
            food_item = self.food_repository.create_custom(
                log_data.custom_food.model_dump(),
            )
        else:
            raise FoodItemNotFoundError(0)

        if log_data.photo_id is not None:
            meal_photo = self.meal_photo_repository.get_by_id(log_data.photo_id)
            if meal_photo is None:
                raise MealPhotoNotFoundError(log_data.photo_id)
            if meal_photo.user_id != log_data.user_id:
                raise MealPhotoUserMismatchError(log_data.photo_id, log_data.user_id)

        quantity = log_data.quantity
        return self.diet_log_repository.create(
            calories=round(food_item.calories_per_serving * quantity, 2),
            carbs_g=round(food_item.carbs_g * quantity, 2),
            fats_g=round(food_item.fats_g * quantity, 2),
            food_item_id=food_item.id,
            meal_type=log_data.meal_type,
            photo_id=log_data.photo_id,
            protein_g=round(food_item.protein_g * quantity, 2),
            quantity=quantity,
            user_id=log_data.user_id,
        )

    def list_logs_for_user(self, user_id: int) -> list[DietLog]:
        self._ensure_user_exists(user_id)
        return self.diet_log_repository.list_by_user_id(user_id)

    def delete_diet_log(self, log_id: int) -> int:
        deleted_log = self.diet_log_repository.delete_by_id(log_id)
        if deleted_log is None:
            raise DietLogNotFoundError(log_id)

        return log_id

    def get_summary_for_user(self, user_id: int) -> DietSummary:
        logs = self.list_logs_for_user(user_id)
        meal_groups: dict[MealType, list[DietLogRead]] = {
            "breakfast": [],
            "lunch": [],
            "dinner": [],
            "snack": [],
        }

        for log in logs:
            meal_groups[log.meal_type].append(DietLogRead.model_validate(log))

        return DietSummary(
            meal_groups=DietMealGroups(**meal_groups),
            total_calories=round(sum(log.calories for log in logs), 2),
            total_carbs_g=round(sum(log.carbs_g for log in logs), 2),
            total_fats_g=round(sum(log.fats_g for log in logs), 2),
            total_protein_g=round(sum(log.protein_g for log in logs), 2),
        )

    def _ensure_user_exists(self, user_id: int) -> None:
        if self.profile_repository.get_by_id(user_id) is None:
            raise DietUserNotFoundError(user_id)

    @staticmethod
    def _validate_image_upload(file: UploadFile, image_bytes: bytes) -> str:
        if file.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise InvalidMealPhotoError("Uploaded file must be an image")

        if not image_bytes:
            raise InvalidMealPhotoError("Uploaded image cannot be empty")

        extension = _extension_from_content_type(file.content_type)
        if extension is None or not _matches_image_signature(extension, image_bytes):
            raise InvalidMealPhotoError("Uploaded file must be a valid image")

        return extension


def _extension_from_content_type(content_type: str | None) -> str | None:
    return {
        "image/gif": ".gif",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(content_type or "")


def _matches_image_signature(extension: str, image_bytes: bytes) -> bool:
    signature = IMAGE_SIGNATURES[extension]
    if extension == ".webp":
        return image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP"

    if isinstance(signature, tuple):
        return any(image_bytes.startswith(candidate) for candidate in signature)

    return image_bytes.startswith(signature)


def suggest_food_names_from_photo_filename(filename: str) -> list[str]:
    normalized_filename = re.sub(r"[^a-z0-9]+", " ", filename.lower())
    tokens = set(normalized_filename.split())
    matched_names: list[str] = []

    for keyword, food_name in SUGGESTION_KEYWORD_TO_FOOD_NAME.items():
        if keyword in tokens or keyword in normalized_filename:
            if food_name not in matched_names:
                matched_names.append(food_name)

    return matched_names or FALLBACK_SUGGESTION_FOOD_NAMES
