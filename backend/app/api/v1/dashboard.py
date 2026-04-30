from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.repositories.activity_repository import ActivityRepository
from app.repositories.diet_log_repository import DietLogRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.workout_result_repository import WorkoutResultRepository
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.activity_service import ActivityService
from app.services.dashboard_service import DashboardService

router = APIRouter(tags=["dashboard"])


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(
        activity_service=ActivityService(
            ActivityRepository(db),
            MongoActivityRepository(),
        ),
        diet_log_repository=DietLogRepository(db),
        profile_repository=ProfileRepository(db),
        subscription_repository=SubscriptionRepository(db),
        workout_result_repository=WorkoutResultRepository(db),
    )


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: AuthUser = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummaryResponse:
    return dashboard_service.get_summary(current_user)
