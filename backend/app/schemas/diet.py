from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel, field_validator, model_validator

MealType = Literal["breakfast", "lunch", "dinner", "snack"]
MealPhotoStatus = Literal["uploaded", "needs_confirmation", "confirmed"]


class FoodItemRead(BaseModel):
    id: int
    name: str
    aliases: list[str] = Field(default_factory=list)
    serving_unit: str
    calories_per_serving: float
    protein_g: float
    carbs_g: float
    fats_g: float
    is_custom: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("aliases", mode="before")
    @classmethod
    def split_aliases(cls, value: object) -> object:
        if value is None:
            return []
        if isinstance(value, str):
            return [alias.strip() for alias in value.split(",") if alias.strip()]
        return value


class FoodItemList(RootModel[list[FoodItemRead]]):
    pass


class CustomFoodCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    aliases: list[str] = Field(default_factory=list, max_length=12)
    serving_unit: str = Field(..., min_length=1, max_length=60)
    calories_per_serving: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(..., ge=0)
    fats_g: float = Field(..., ge=0)

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "serving_unit")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        stripped_value = value.strip()
        if not stripped_value:
            raise ValueError("Field cannot be blank")
        return stripped_value

    @field_validator("aliases")
    @classmethod
    def strip_aliases(cls, value: list[str]) -> list[str]:
        return [alias.strip() for alias in value if alias.strip()]


class DietLogCreate(BaseModel):
    user_id: int = Field(..., ge=1)
    food_item_id: int | None = Field(default=None, ge=1)
    custom_food: CustomFoodCreate | None = None
    quantity: float = Field(..., gt=0)
    meal_type: MealType
    photo_id: int | None = Field(default=None, ge=1)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def require_food_or_custom_food(self) -> "DietLogCreate":
        if (self.food_item_id is None) == (self.custom_food is None):
            raise ValueError("Provide either food_item_id or custom_food")
        return self


class DietLogRead(BaseModel):
    id: int
    user_id: int
    food_item_id: int
    quantity: float
    meal_type: MealType
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float
    photo_id: int | None
    logged_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DietLogList(RootModel[list[DietLogRead]]):
    pass


class DietLogDeleteResponse(BaseModel):
    deleted_id: int
    message: str


class MealPhotoUploadResponse(BaseModel):
    photo_id: int
    image_path: str
    image_url: str
    analysis_status: MealPhotoStatus
    suggested_foods: list[FoodItemRead] = Field(default_factory=list)
    message: str

    @field_validator("suggested_foods", mode="before")
    @classmethod
    def ensure_suggested_foods_list(cls, value: object) -> object:
        return [] if value is None else value


class MealPhotoSuggestionsResponse(BaseModel):
    photo_id: int
    suggested_foods: list[FoodItemRead] = Field(default_factory=list)
    message: str

    @field_validator("suggested_foods", mode="before")
    @classmethod
    def ensure_suggested_foods_list(cls, value: object) -> object:
        return [] if value is None else value


class DietMealGroups(BaseModel):
    breakfast: list[DietLogRead]
    lunch: list[DietLogRead]
    dinner: list[DietLogRead]
    snack: list[DietLogRead]


class DietSummary(BaseModel):
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fats_g: float
    meal_groups: DietMealGroups
