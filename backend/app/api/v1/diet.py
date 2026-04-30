from typing import NoReturn

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_optional_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.models.diet_log import DietLog
from app.repositories.activity_repository import ActivityRepository
from app.repositories.diet_log_repository import DietLogRepository
from app.repositories.food_repository import FoodRepository
from app.repositories.meal_photo_repository import MealPhotoRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.diet import (
    DietLogCreate,
    DietLogDeleteResponse,
    DietLogList,
    DietLogRead,
    DietSummary,
    FoodItemRead,
    MealPhotoSuggestionsResponse,
    MealPhotoUploadResponse,
    MealType,
)
from app.services.diet_service import (
    DietLogNotFoundError,
    DietService,
    DietUserNotFoundError,
    FoodItemNotFoundError,
    InvalidMealPhotoError,
    MealPhotoTooLargeError,
    MealPhotoUserMismatchError,
    MealPhotoNotFoundError,
    SUGGESTION_RESPONSE_MESSAGE,
)
from app.services.activity_service import ActivityService

router = APIRouter(tags=["diet"])


def get_diet_service(db: Session = Depends(get_db)) -> DietService:
    return DietService(
        diet_log_repository=DietLogRepository(db),
        food_repository=FoodRepository(db),
        meal_photo_repository=MealPhotoRepository(db),
        profile_repository=ProfileRepository(db),
    )


def get_activity_service(db: Session = Depends(get_db)) -> ActivityService:
    return ActivityService(ActivityRepository(db), MongoActivityRepository())


def raise_user_not_found(error: DietUserNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"User profile with id {error.user_id} was not found",
    )


def raise_food_not_found(error: FoodItemNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Food item with id {error.food_item_id} was not found",
    )


def raise_log_not_found(error: DietLogNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Diet log with id {error.log_id} was not found",
    )


def raise_photo_not_found(error: MealPhotoNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Meal photo with id {error.photo_id} was not found",
    )


@router.post(
    "/photos/upload",
    response_model=MealPhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_meal_photo(
    file: UploadFile = File(...),
    user_id: int = Form(..., ge=1),
    meal_type: MealType = Form(...),
    diet_service: DietService = Depends(get_diet_service),
) -> MealPhotoUploadResponse:
    try:
        meal_photo = await diet_service.upload_meal_photo(
            file=file,
            meal_type=meal_type,
            user_id=user_id,
        )
    except DietUserNotFoundError as error:
        raise_user_not_found(error)
    except MealPhotoTooLargeError as error:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded image must be {error.max_bytes} bytes or smaller",
        ) from error
    except InvalidMealPhotoError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    return MealPhotoUploadResponse(
        analysis_status="needs_confirmation",
        image_path=meal_photo.image_path,
        image_url=f"/{meal_photo.image_path}",
        message=SUGGESTION_RESPONSE_MESSAGE,
        photo_id=meal_photo.id,
        suggested_foods=[],
    )


@router.get(
    "/photos/{photo_id}/suggestions",
    response_model=MealPhotoSuggestionsResponse,
)
def get_meal_photo_suggestions(
    photo_id: int,
    diet_service: DietService = Depends(get_diet_service),
) -> MealPhotoSuggestionsResponse:
    try:
        suggested_foods = diet_service.suggest_foods_for_photo(photo_id)
    except MealPhotoNotFoundError as error:
        raise_photo_not_found(error)

    return MealPhotoSuggestionsResponse(
        message=SUGGESTION_RESPONSE_MESSAGE,
        photo_id=photo_id,
        suggested_foods=[
            FoodItemRead.model_validate(food) for food in suggested_foods
        ],
    )


@router.post(
    "/logs",
    response_model=DietLogRead,
    status_code=status.HTTP_201_CREATED,
)
def create_diet_log(
    log_data: DietLogCreate,
    diet_service: DietService = Depends(get_diet_service),
    current_user: AuthUser | None = Depends(get_optional_current_user),
    activity_service: ActivityService = Depends(get_activity_service),
) -> DietLog:
    try:
        diet_log = diet_service.create_diet_log(log_data)
    except DietUserNotFoundError as error:
        raise_user_not_found(error)
    except FoodItemNotFoundError as error:
        raise_food_not_found(error)
    except MealPhotoNotFoundError as error:
        raise_photo_not_found(error)
    except MealPhotoUserMismatchError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Meal photo with id {error.photo_id} does not belong to user {error.user_id}",
        ) from error

    if current_user is not None:
        activity_service.record_activity(current_user.id, "diet_log")
    return diet_log


@router.delete("/logs/{log_id}", response_model=DietLogDeleteResponse)
def delete_diet_log(
    log_id: int,
    diet_service: DietService = Depends(get_diet_service),
) -> DietLogDeleteResponse:
    try:
        deleted_id = diet_service.delete_diet_log(log_id)
    except DietLogNotFoundError as error:
        raise_log_not_found(error)

    return DietLogDeleteResponse(
        deleted_id=deleted_id,
        message="Diet log deleted successfully",
    )


@router.get("/logs/user/{user_id}", response_model=DietLogList)
def list_diet_logs_for_user(
    user_id: int,
    diet_service: DietService = Depends(get_diet_service),
) -> DietLogList:
    try:
        return DietLogList(root=diet_service.list_logs_for_user(user_id))
    except DietUserNotFoundError as error:
        raise_user_not_found(error)


@router.get("/summary/user/{user_id}", response_model=DietSummary)
def get_diet_summary_for_user(
    user_id: int,
    diet_service: DietService = Depends(get_diet_service),
) -> DietSummary:
    try:
        return diet_service.get_summary_for_user(user_id)
    except DietUserNotFoundError as error:
        raise_user_not_found(error)
