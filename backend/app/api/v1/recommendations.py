from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.recommendation import Recommendation
from app.repositories.profile_repository import ProfileRepository
from app.repositories.recommendation_repository import RecommendationRepository
from app.repositories.workout_result_repository import WorkoutResultRepository
from app.schemas.recommendation import (
    RecommendationCreate,
    RecommendationList,
    RecommendationRead,
)
from app.services.recommendation_service import (
    RecommendationNotFoundError,
    RecommendationOwnershipError,
    RecommendationService,
    RecommendationUserNotFoundError,
    RecommendationWorkoutResultNotFoundError,
)

router = APIRouter(tags=["recommendations"])


def get_recommendation_service(db: Session = Depends(get_db)) -> RecommendationService:
    return RecommendationService(
        recommendation_repository=RecommendationRepository(db),
        profile_repository=ProfileRepository(db),
        workout_result_repository=WorkoutResultRepository(db),
    )


def raise_recommendation_not_found(error: RecommendationNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Recommendation with id {error.recommendation_id} was not found",
    )


def raise_user_not_found(error: RecommendationUserNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"User profile with id {error.user_id} was not found",
    )


def raise_workout_result_not_found(
    error: RecommendationWorkoutResultNotFoundError,
) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Workout result with id {error.workout_result_id} was not found",
    )


def raise_ownership_error(error: RecommendationOwnershipError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"Workout result {error.workout_result_id} "
            f"does not belong to user {error.user_id}"
        ),
    )


@router.post(
    "",
    response_model=RecommendationRead,
    status_code=status.HTTP_201_CREATED,
)
def generate_recommendation(
    recommendation_data: RecommendationCreate,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> Recommendation:
    try:
        return recommendation_service.generate_recommendation(recommendation_data)
    except RecommendationUserNotFoundError as error:
        raise_user_not_found(error)
    except RecommendationWorkoutResultNotFoundError as error:
        raise_workout_result_not_found(error)
    except RecommendationOwnershipError as error:
        raise_ownership_error(error)


@router.get("", response_model=RecommendationList)
def list_recommendations(
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> RecommendationList:
    return RecommendationList(root=recommendation_service.list_recommendations())


@router.get("/user/{user_id}", response_model=RecommendationList)
def list_recommendations_for_user(
    user_id: int,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> RecommendationList:
    try:
        return RecommendationList(
            root=recommendation_service.list_recommendations_for_user(user_id),
        )
    except RecommendationUserNotFoundError as error:
        raise_user_not_found(error)


@router.get("/{recommendation_id}", response_model=RecommendationRead)
def get_recommendation(
    recommendation_id: int,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> Recommendation:
    try:
        return recommendation_service.get_recommendation(recommendation_id)
    except RecommendationNotFoundError as error:
        raise_recommendation_not_found(error)


@router.delete("/{recommendation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recommendation(
    recommendation_id: int,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
) -> None:
    try:
        recommendation_service.delete_recommendation(recommendation_id)
    except RecommendationNotFoundError as error:
        raise_recommendation_not_found(error)
