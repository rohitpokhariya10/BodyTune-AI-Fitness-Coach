from typing import NoReturn

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api.v1.auth import get_current_user, require_admin_user
from app.core.config import get_settings
from app.db.mongo import mongo_error, mongo_status
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.models.exercise_video import ExerciseVideo
from app.models.subscription_plan import SubscriptionPlan
from app.models.user_subscription import UserSubscription
from app.repositories.auth_repository import AuthUserRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.video_repository import ExerciseVideoRepository
from app.schemas.auth import AuthUserRead
from app.schemas.dashboard import AdminSummaryResponse
from app.schemas.subscription import (
    SubscriptionPlanCreate,
    SubscriptionPlanList,
    SubscriptionPlanRead,
    SubscriptionPlanUpdate,
)
from app.schemas.video import (
    ExerciseVideoCreate,
    ExerciseVideoList,
    ExerciseVideoRead,
    ExerciseVideoUpdate,
    UploadedVideoAssetRead,
)
from app.services.subscription_service import (
    SubscriptionPlanNotFoundError,
    SubscriptionService,
)
from app.services.imagekit_service import (
    THUMBNAIL_FOLDER,
    VIDEO_FOLDER,
    upload_thumbnail,
    upload_video,
)
from app.services.video_service import ExerciseVideoNotFoundError, VideoService

router = APIRouter(tags=["admin"])

def get_subscription_service(db: Session = Depends(get_db)) -> SubscriptionService:
    return SubscriptionService(SubscriptionRepository(db))


def get_video_service(db: Session = Depends(get_db)) -> VideoService:
    subscription_service = SubscriptionService(SubscriptionRepository(db))
    return VideoService(
        video_repository=ExerciseVideoRepository(db),
        subscription_service=subscription_service,
    )


def require_admin_jwt(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def raise_video_not_found(error: ExerciseVideoNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Exercise video with id {error.video_id} was not found",
    )


def raise_plan_not_found(error: SubscriptionPlanNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Subscription plan with id {error.plan_id} was not found",
    )


@router.get("/summary", response_model=AdminSummaryResponse)
def get_admin_summary(
    _: AuthUser = Depends(require_admin_jwt),
    db: Session = Depends(get_db),
) -> AdminSummaryResponse:
    users = AuthUserRepository(db).list_all()
    videos = ExerciseVideoRepository(db).list_all()
    plans = SubscriptionRepository(db).list_plans(include_inactive=True)
    subscriptions = list(db.scalars(select(UserSubscription)).all())

    return AdminSummaryResponse(
        total_users=len(users),
        verified_users=sum(1 for user in users if user.is_verified),
        admin_users=sum(1 for user in users if user.role == "admin"),
        total_videos=len(videos),
        active_videos=sum(1 for video in videos if video.is_active),
        premium_videos=sum(1 for video in videos if video.is_premium),
        total_plans=len(plans),
        total_subscriptions=len(subscriptions),
    )


@router.get("/users", response_model=list[AuthUserRead])
def list_users(
    _: AuthUser = Depends(require_admin_jwt),
    db: Session = Depends(get_db),
) -> list[AuthUser]:
    return AuthUserRepository(db).list_all()


@router.get("/settings")
def get_admin_settings(
    _: AuthUser = Depends(require_admin_jwt),
) -> dict[str, object]:
    settings = get_settings()
    return {
        "mongo": {
            "db_name": settings.mongo_db_name,
            "enabled": settings.mongo_enabled,
            "error": mongo_error() if mongo_status() == "error" else None,
            "status": mongo_status(),
        },
        "media": {
            "configured": bool(
                settings.imagekit_public_key.strip()
                and settings.imagekit_private_key.strip()
                and settings.imagekit_url_endpoint.strip()
            ),
            "folders": {
                "thumbnails": THUMBNAIL_FOLDER,
                "videos": VIDEO_FOLDER,
            },
            "storage": "ImageKit",
        },
    }


@router.post("/uploads/video", response_model=UploadedVideoAssetRead)
def upload_exercise_video(
    file: UploadFile = File(...),
    _: AuthUser = Depends(require_admin_jwt),
) -> UploadedVideoAssetRead:
    return upload_video(file)


@router.post("/uploads/thumbnail", response_model=UploadedVideoAssetRead)
def upload_exercise_thumbnail(
    file: UploadFile = File(...),
    _: AuthUser = Depends(require_admin_jwt),
) -> UploadedVideoAssetRead:
    return upload_thumbnail(file)


@router.post(
    "/videos",
    response_model=ExerciseVideoRead,
    status_code=status.HTTP_201_CREATED,
)
def create_video(
    video_data: ExerciseVideoCreate,
    _: object = Depends(require_admin_user),
    video_service: VideoService = Depends(get_video_service),
) -> ExerciseVideo:
    return video_service.create_video(video_data)


@router.get("/videos", response_model=ExerciseVideoList)
def list_videos(
    _: object = Depends(require_admin_user),
    video_service: VideoService = Depends(get_video_service),
) -> ExerciseVideoList:
    return ExerciseVideoList(root=video_service.list_admin_videos())


@router.put("/videos/{video_id}", response_model=ExerciseVideoRead)
def update_video(
    video_id: int,
    video_data: ExerciseVideoUpdate,
    _: object = Depends(require_admin_user),
    video_service: VideoService = Depends(get_video_service),
) -> ExerciseVideo:
    try:
        return video_service.update_video(video_id, video_data)
    except ExerciseVideoNotFoundError as error:
        raise_video_not_found(error)


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: int,
    _: object = Depends(require_admin_user),
    video_service: VideoService = Depends(get_video_service),
) -> None:
    try:
        video_service.delete_video(video_id)
    except ExerciseVideoNotFoundError as error:
        raise_video_not_found(error)


@router.post(
    "/plans",
    response_model=SubscriptionPlanRead,
    status_code=status.HTTP_201_CREATED,
)
def create_plan(
    plan_data: SubscriptionPlanCreate,
    _: object = Depends(require_admin_user),
    subscription_service: SubscriptionService = Depends(get_subscription_service),
) -> SubscriptionPlan:
    return subscription_service.create_plan(plan_data)


@router.get("/plans", response_model=SubscriptionPlanList)
def list_plans(
    _: object = Depends(require_admin_user),
    subscription_service: SubscriptionService = Depends(get_subscription_service),
) -> SubscriptionPlanList:
    return SubscriptionPlanList(root=subscription_service.list_plans(include_inactive=True))


@router.put("/plans/{plan_id}", response_model=SubscriptionPlanRead)
def update_plan(
    plan_id: int,
    plan_data: SubscriptionPlanUpdate,
    _: object = Depends(require_admin_user),
    subscription_service: SubscriptionService = Depends(get_subscription_service),
) -> SubscriptionPlan:
    try:
        return subscription_service.update_plan(plan_id, plan_data)
    except SubscriptionPlanNotFoundError as error:
        raise_plan_not_found(error)
