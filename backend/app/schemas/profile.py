from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FitnessGoal = Literal["general_fitness", "strength", "weight_loss", "mobility"]
ExperienceLevel = Literal["beginner", "intermediate", "advanced"]


class UserProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    age: int = Field(..., ge=13, le=100)
    height_cm: float = Field(..., ge=80, le=250)
    weight_kg: float = Field(..., ge=25, le=300)
    fitness_goal: FitnessGoal
    experience_level: ExperienceLevel
    calorie_goal: int | None = None
    protein_goal_g: int | None = None
    carbs_goal_g: int | None = None
    fats_goal_g: int | None = None

    model_config = ConfigDict(extra="forbid")


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    age: int | None = Field(default=None, ge=13, le=100)
    height_cm: float | None = Field(default=None, ge=80, le=250)
    weight_kg: float | None = Field(default=None, ge=25, le=300)
    fitness_goal: FitnessGoal | None = None
    experience_level: ExperienceLevel | None = None
    calorie_goal: int | None = None
    protein_goal_g: int | None = None
    carbs_goal_g: int | None = None
    fats_goal_g: int | None = None

    model_config = ConfigDict(extra="forbid")


class UserProfileRead(UserProfileBase):
    age: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
