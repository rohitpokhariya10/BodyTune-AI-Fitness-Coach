from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

FitnessGoal = Literal[
    "fat_loss",
    "muscle_gain",
    "strength",
    "endurance",
    "general_fitness",
]
Gender = Literal["male", "female", "other", "prefer_not_to_say"]
Budget = Literal["low", "medium", "high"]
DietType = Literal["vegetarian", "non_vegetarian", "vegan", "eggetarian", "mixed"]
ActivityLevel = Literal["sedentary", "light", "moderate", "active"]
ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
WorkoutLocation = Literal["home", "gym", "mixed"]


class AIPlanGenerateRequest(BaseModel):
    goal: FitnessGoal
    age: int = Field(..., ge=13, le=100)
    gender: Gender | None = None
    height_cm: float = Field(..., ge=80, le=250)
    weight_kg: float = Field(..., ge=25, le=300)
    budget: Budget
    monthly_budget: int | None = Field(default=None, ge=0, le=500000)
    diet_type: DietType
    meals_per_day: int = Field(..., ge=2, le=6)
    activity_level: ActivityLevel
    experience_level: ExperienceLevel
    workout_location: WorkoutLocation
    equipment: str = Field(default="", max_length=300)
    days_per_week: int = Field(..., ge=1, le=7)
    workout_time_minutes: int = Field(..., ge=10, le=180)
    allergies_restrictions: str = Field(default="", max_length=700)
    medical_note: str = Field(default="", max_length=700)
    duration_days: Literal[7, 14, 30]

    @field_validator("equipment", "allergies_restrictions", "medical_note")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    model_config = ConfigDict(extra="forbid")


class AIPlanRead(BaseModel):
    id: int
    user_id: int
    title: str
    goal: FitnessGoal
    input_data: dict[str, Any]
    plan_data: dict[str, Any]
    duration_days: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
