from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.food_item import FoodItem
from app.repositories.diet_log_repository import DietLogRepository
from app.repositories.food_repository import FoodRepository
from app.repositories.meal_photo_repository import MealPhotoRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.diet import FoodItemList
from app.services.diet_service import DietService

router = APIRouter(tags=["foods"])


def get_diet_service(db: Session = Depends(get_db)) -> DietService:
    return DietService(
        diet_log_repository=DietLogRepository(db),
        food_repository=FoodRepository(db),
        meal_photo_repository=MealPhotoRepository(db),
        profile_repository=ProfileRepository(db),
    )


@router.get("", response_model=FoodItemList)
def list_foods(
    diet_service: DietService = Depends(get_diet_service),
) -> FoodItemList:
    return FoodItemList(root=diet_service.list_foods())


@router.get("/search", response_model=FoodItemList)
def search_foods(
    q: str = Query(default="", max_length=120),
    diet_service: DietService = Depends(get_diet_service),
) -> list[FoodItem]:
    return diet_service.search_foods(q)
