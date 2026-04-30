from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user, get_optional_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.models.workout_result import WorkoutResult
from app.repositories.activity_repository import ActivityRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.workout_result_repository import WorkoutResultRepository
from app.schemas.result import (
    WorkoutResultCreate,
    WorkoutResultList,
    WorkoutResultRead,
)
from app.services.workout_service import (
    WorkoutResultNotFoundError,
    WorkoutResultUserNotFoundError,
    WorkoutService,
)
from app.services.activity_service import ActivityService

router = APIRouter(tags=["results"])


def get_workout_service(db: Session = Depends(get_db)) -> WorkoutService:
    return WorkoutService(
        workout_result_repository=WorkoutResultRepository(db),
        profile_repository=ProfileRepository(db),
    )


def get_activity_service(db: Session = Depends(get_db)) -> ActivityService:
    return ActivityService(ActivityRepository(db), MongoActivityRepository())


def get_workout_result_repository(
    db: Session = Depends(get_db),
) -> WorkoutResultRepository:
    return WorkoutResultRepository(db)


def raise_result_not_found(error: WorkoutResultNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Workout result with id {error.result_id} was not found",
    )


def raise_user_not_found(error: WorkoutResultUserNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"User profile with id {error.user_id} was not found",
    )


@router.post(
    "",
    response_model=WorkoutResultRead,
    status_code=status.HTTP_201_CREATED,
)
def create_result(
    result_data: WorkoutResultCreate,
    workout_service: WorkoutService = Depends(get_workout_service),
    current_user: AuthUser | None = Depends(get_optional_current_user),
    activity_service: ActivityService = Depends(get_activity_service),
) -> WorkoutResult:
    try:
        workout_result = workout_service.create_result(result_data)
    except WorkoutResultUserNotFoundError as error:
        raise_user_not_found(error)

    if current_user is not None:
        activity_service.record_activity(current_user.id, "workout")
    return workout_result


@router.get("", response_model=WorkoutResultList)
def list_results(
    workout_service: WorkoutService = Depends(get_workout_service),
) -> WorkoutResultList:
    return WorkoutResultList(root=workout_service.list_results())


@router.get("/user/{user_id}", response_model=WorkoutResultList)
def list_results_for_user(
    user_id: int,
    workout_service: WorkoutService = Depends(get_workout_service),
) -> WorkoutResultList:
    try:
        return WorkoutResultList(root=workout_service.list_results_for_user(user_id))
    except WorkoutResultUserNotFoundError as error:
        raise_user_not_found(error)


@router.get("/me", response_model=WorkoutResultList)
def list_my_results(
    current_user: AuthUser = Depends(get_current_user),
    workout_result_repository: WorkoutResultRepository = Depends(
        get_workout_result_repository,
    ),
) -> WorkoutResultList:
    return WorkoutResultList(
        root=workout_result_repository.list_by_user_id(current_user.id),
    )


@router.get("/{result_id}", response_model=WorkoutResultRead)
def get_result(
    result_id: int,
    workout_service: WorkoutService = Depends(get_workout_service),
) -> WorkoutResult:
    try:
        return workout_service.get_result(result_id)
    except WorkoutResultNotFoundError as error:
        raise_result_not_found(error)


@router.delete("/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_result(
    result_id: int,
    workout_service: WorkoutService = Depends(get_workout_service),
) -> None:
    try:
        workout_service.delete_result(result_id)
    except WorkoutResultNotFoundError as error:
        raise_result_not_found(error)
