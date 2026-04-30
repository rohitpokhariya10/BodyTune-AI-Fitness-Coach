from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.repositories.activity_repository import ActivityRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository
from app.schemas.activity import (
    ActivityHeatmapResponse,
    ActivityRecordRequest,
    ActivityRecordResponse,
    ActivitySummaryResponse,
    ActivityVideoWatchRequest,
)
from app.services.activity_service import ActivityService, InvalidActivityTypeError

router = APIRouter(tags=["activity"])


def get_activity_service(db: Session = Depends(get_db)) -> ActivityService:
    return ActivityService(ActivityRepository(db), MongoActivityRepository())


def raise_invalid_activity_type(error: InvalidActivityTypeError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported activity type: {error.activity_type}",
    )


@router.get("/summary", response_model=ActivitySummaryResponse)
def get_activity_summary(
    current_user: AuthUser = Depends(get_current_user),
    activity_service: ActivityService = Depends(get_activity_service),
) -> dict[str, int]:
    return activity_service.get_activity_summary(current_user.id)


@router.get("/heatmap", response_model=ActivityHeatmapResponse)
def get_activity_heatmap(
    days: int = Query(default=365, ge=1, le=730),
    current_user: AuthUser = Depends(get_current_user),
    activity_service: ActivityService = Depends(get_activity_service),
) -> ActivityHeatmapResponse:
    return ActivityHeatmapResponse(
        days=activity_service.get_user_activity_heatmap(current_user.id, days),
    )


@router.post("/record", response_model=ActivityRecordResponse)
def record_activity(
    payload: ActivityRecordRequest,
    current_user: AuthUser = Depends(get_current_user),
    activity_service: ActivityService = Depends(get_activity_service),
) -> ActivityRecordResponse:
    try:
        activity_log = activity_service.record_activity(
            current_user.id,
            payload.activity_type,
        )
    except InvalidActivityTypeError as error:
        raise_invalid_activity_type(error)

    return ActivityRecordResponse(
        activity_count=activity_log.activity_count,
        activity_type=payload.activity_type,
        message="Activity recorded",
    )


@router.post("/video-watch", response_model=ActivityRecordResponse)
def record_video_watch(
    payload: ActivityVideoWatchRequest,
    current_user: AuthUser = Depends(get_current_user),
    activity_service: ActivityService = Depends(get_activity_service),
) -> ActivityRecordResponse:
    _ = payload.video_id
    activity_log = activity_service.record_activity(current_user.id, "video_watch")
    return ActivityRecordResponse(
        activity_count=activity_log.activity_count,
        activity_type="video_watch",
        message="Video watch activity recorded",
    )
