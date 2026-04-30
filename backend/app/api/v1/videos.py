from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_optional_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.video_repository import ExerciseVideoRepository
from app.schemas.video import UserExerciseVideoList, VideoAccessRead
from app.services.subscription_service import SubscriptionService
from app.services.video_service import ExerciseVideoNotFoundError, VideoService

router = APIRouter(tags=["videos"])


def get_video_service(db: Session = Depends(get_db)) -> VideoService:
    return VideoService(
        video_repository=ExerciseVideoRepository(db),
        subscription_service=SubscriptionService(SubscriptionRepository(db)),
    )


def raise_video_not_found(error: ExerciseVideoNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Exercise video with id {error.video_id} was not found",
    )


@router.get("", response_model=UserExerciseVideoList)
def list_videos(
    user_id: int | None = Query(default=None, ge=1),
    current_user: AuthUser | None = Depends(get_optional_current_user),
    video_service: VideoService = Depends(get_video_service),
) -> UserExerciseVideoList:
    effective_user_id = current_user.id if current_user is not None else user_id
    return UserExerciseVideoList(root=video_service.list_user_videos(effective_user_id))


@router.get("/{video_id}", response_model=VideoAccessRead)
def get_video(
    video_id: int,
    user_id: int | None = Query(default=None, ge=1),
    current_user: AuthUser | None = Depends(get_optional_current_user),
    video_service: VideoService = Depends(get_video_service),
) -> VideoAccessRead:
    try:
        effective_user_id = current_user.id if current_user is not None else user_id
        return video_service.get_user_video(video_id, effective_user_id)
    except ExerciseVideoNotFoundError as error:
        raise_video_not_found(error)
