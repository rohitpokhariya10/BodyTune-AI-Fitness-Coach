from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel, StrictStr, model_validator

WorkoutType = Literal["squat", "push_up", "crunch", "bicep_curl"]


class WorkoutResultBase(BaseModel):
    user_id: int = Field(..., ge=1)
    workout_type: WorkoutType
    duration_seconds: int = Field(..., ge=1)
    total_reps: int = Field(..., ge=0)
    correct_reps: int = Field(..., ge=0)
    incorrect_reps: int = Field(..., ge=0)
    primary_feedback: str | None = Field(default=None, max_length=255)
    feedback_tags: list[StrictStr] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_rep_total(self) -> "WorkoutResultBase":
        if self.correct_reps + self.incorrect_reps != self.total_reps:
            raise ValueError("correct_reps + incorrect_reps must equal total_reps")
        return self


class WorkoutResultCreate(WorkoutResultBase):
    pass


class WorkoutResultRead(WorkoutResultBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkoutResultList(RootModel[list[WorkoutResultRead]]):
    pass


class ExerciseWorkoutSummary(BaseModel):
    exercise_key: str
    exercise_name: str
    total_sessions: int
    total_reps: int
    last_score: int | None
    best_score: int | None
    average_score: int | None
    last_session_at: datetime | None


class WorkoutSummaryResponse(BaseModel):
    total_sessions: int
    total_reps: int
    best_score: int
    average_form_score: int
    active_streak: int
    exercise_stats: list[ExerciseWorkoutSummary]
    recent_sessions: list[WorkoutResultRead]
