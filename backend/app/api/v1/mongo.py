from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, StrictStr

from app.api.v1.auth import require_admin_user
from app.core.config import get_settings
from app.db.mongo import mongo_status
from app.models.auth_user import AuthUser
from app.repositories.mongo_video_repository import (
    MongoVideoNotFoundError,
    MongoVideoRepository,
)
from app.schemas.video import ExerciseDifficulty

router = APIRouter(tags=["mongo"])


class MongoExerciseVideoCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=160)
    description: str = Field(..., min_length=2, max_length=4000)
    category: str = Field(..., min_length=2, max_length=80)
    difficulty: ExerciseDifficulty
    duration_minutes: int = Field(..., ge=1, le=300)
    equipment: str = Field(default="", max_length=160)
    target_muscles: list[StrictStr] = Field(default_factory=list)
    video_url: str | None = Field(default=None, max_length=600)
    thumbnail_url: str | None = Field(default=None, max_length=600)
    imagekit_video_file_id: str | None = Field(default=None, max_length=160)
    imagekit_thumbnail_file_id: str | None = Field(default=None, max_length=160)
    is_premium: bool = False
    is_active: bool = True

    model_config = ConfigDict(extra="forbid")


class MongoExerciseVideoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, min_length=2, max_length=4000)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    difficulty: ExerciseDifficulty | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=300)
    equipment: str | None = Field(default=None, max_length=160)
    target_muscles: list[StrictStr] | None = None
    video_url: str | None = Field(default=None, max_length=600)
    thumbnail_url: str | None = Field(default=None, max_length=600)
    imagekit_video_file_id: str | None = Field(default=None, max_length=160)
    imagekit_thumbnail_file_id: str | None = Field(default=None, max_length=160)
    is_premium: bool | None = None
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")


def require_mongo_enabled() -> None:
    settings = get_settings()
    if not settings.mongo_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is disabled",
        )
    if mongo_status() != "connected":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is not connected",
        )


def created_by_from_admin(admin: object) -> int:
    return admin.id if isinstance(admin, AuthUser) else 0


def raise_mongo_video_not_found(error: MongoVideoNotFoundError) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Mongo exercise video with id {error.video_id} was not found",
    )


@router.get("/videos")
async def list_mongo_videos(
    _: None = Depends(require_mongo_enabled),
    __: object = Depends(require_admin_user),
) -> list[dict[str, Any]]:
    return await MongoVideoRepository().list_videos()


@router.post("/videos", status_code=status.HTTP_201_CREATED)
async def create_mongo_video(
    video_data: MongoExerciseVideoCreate,
    _: None = Depends(require_mongo_enabled),
    admin: object = Depends(require_admin_user),
) -> dict[str, Any]:
    return await MongoVideoRepository().create_video(
        created_by=created_by_from_admin(admin),
        video_data=video_data.model_dump(),
    )


@router.put("/videos/{video_id}")
async def update_mongo_video(
    video_id: str,
    video_data: MongoExerciseVideoUpdate,
    _: None = Depends(require_mongo_enabled),
    __: object = Depends(require_admin_user),
) -> dict[str, Any]:
    try:
        return await MongoVideoRepository().update_video(
            update_data=video_data.model_dump(exclude_unset=True),
            video_id=video_id,
        )
    except MongoVideoNotFoundError as error:
        raise_mongo_video_not_found(error)


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mongo_video(
    video_id: str,
    _: None = Depends(require_mongo_enabled),
    __: object = Depends(require_admin_user),
) -> None:
    try:
        await MongoVideoRepository().delete_video(video_id)
    except MongoVideoNotFoundError as error:
        raise_mongo_video_not_found(error)
