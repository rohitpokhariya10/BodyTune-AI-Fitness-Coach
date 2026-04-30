from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.repositories.profile_repository import ProfileRepository
from app.repositories.workout_result_repository import WorkoutResultRepository
from app.schemas.result import WorkoutSummaryResponse
from app.services.workout_service import WorkoutResultUserNotFoundError, WorkoutService

router = APIRouter(tags=["workouts"])


def get_workout_service(db: Session = Depends(get_db)) -> WorkoutService:
    return WorkoutService(
        workout_result_repository=WorkoutResultRepository(db),
        profile_repository=ProfileRepository(db),
    )


def raise_user_not_found(error: WorkoutResultUserNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"User profile with id {error.user_id} was not found",
    )


@router.get("/summary", response_model=WorkoutSummaryResponse)
def get_workout_summary(
    current_user: AuthUser = Depends(get_current_user),
    workout_service: WorkoutService = Depends(get_workout_service),
) -> WorkoutSummaryResponse:
    try:
        return workout_service.get_summary_for_user(current_user.id)
    except WorkoutResultUserNotFoundError as error:
        raise_user_not_found(error)
