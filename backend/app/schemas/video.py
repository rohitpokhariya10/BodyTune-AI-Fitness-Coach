from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, RootModel, StrictStr, field_validator

ExerciseDifficulty = Literal["beginner", "intermediate", "advanced"]
LOCAL_EXERCISE_UPLOAD_MARKERS = (
    "/uploads/",
    "http://127.0.0.1",
    "http://localhost",
)


def reject_local_exercise_upload_url(value: str | None) -> str | None:
    if not value:
        return value

    normalized = value.strip().lower()
    if any(marker in normalized for marker in LOCAL_EXERCISE_UPLOAD_MARKERS):
        raise ValueError(
            "Admin exercise media must use an ImageKit URL or a valid HTTPS URL.",
        )
    parsed_url = urlparse(value.strip())
    if parsed_url.scheme and parsed_url.scheme != "https":
        raise ValueError(
            "Admin exercise media must use an ImageKit URL or a valid HTTPS URL.",
        )
    return value


class ExerciseVideoBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=160)
    description: str = Field(..., min_length=2, max_length=4000)
    category: str = Field(..., min_length=2, max_length=80)
    difficulty: ExerciseDifficulty
    duration_minutes: int = Field(..., ge=1, le=300)
    target_muscles: list[StrictStr] = Field(default_factory=list)
    equipment: str = Field(default="", max_length=160)
    video_url: str = Field(..., min_length=1, max_length=600)
    thumbnail_url: str = Field(default="", max_length=600)
    imagekit_video_file_id: str = Field(default="", max_length=160)
    imagekit_thumbnail_file_id: str = Field(default="", max_length=160)
    is_premium: bool = False
    is_active: bool = True

    @field_validator("video_url", "thumbnail_url")
    @classmethod
    def validate_media_url(cls, value: str) -> str:
        return reject_local_exercise_upload_url(value) or value

    model_config = ConfigDict(extra="forbid")


class ExerciseVideoCreate(ExerciseVideoBase):
    pass


class ExerciseVideoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, min_length=2, max_length=4000)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    difficulty: ExerciseDifficulty | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=300)
    target_muscles: list[StrictStr] | None = None
    equipment: str | None = Field(default=None, max_length=160)
    video_url: str | None = Field(default=None, min_length=1, max_length=600)
    thumbnail_url: str | None = Field(default=None, max_length=600)
    imagekit_video_file_id: str | None = Field(default=None, max_length=160)
    imagekit_thumbnail_file_id: str | None = Field(default=None, max_length=160)
    is_premium: bool | None = None
    is_active: bool | None = None

    @field_validator("video_url", "thumbnail_url")
    @classmethod
    def validate_media_url(cls, value: str | None) -> str | None:
        return reject_local_exercise_upload_url(value)

    model_config = ConfigDict(extra="forbid")


class ExerciseVideoRead(ExerciseVideoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserExerciseVideoRead(ExerciseVideoRead):
    locked: bool = False


class ExerciseVideoList(RootModel[list[ExerciseVideoRead]]):
    pass


class UserExerciseVideoList(RootModel[list[UserExerciseVideoRead]]):
    pass


class VideoAccessRead(BaseModel):
    locked: bool
    message: str
    video: UserExerciseVideoRead


class UploadedVideoAssetRead(BaseModel):
    url: str
    file_id: str
    name: str
    size: int
    file_type: str
