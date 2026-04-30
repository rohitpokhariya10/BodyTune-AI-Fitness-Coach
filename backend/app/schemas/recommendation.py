from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel

RecommendationType = Literal["form", "volume", "consistency", "progression"]


class RecommendationCreate(BaseModel):
    user_id: int = Field(..., ge=1)
    workout_result_id: int = Field(..., ge=1)

    model_config = ConfigDict(extra="forbid")


class RecommendationRead(BaseModel):
    id: int
    user_id: int
    workout_result_id: int
    recommendation_type: RecommendationType
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationList(RootModel[list[RecommendationRead]]):
    pass
