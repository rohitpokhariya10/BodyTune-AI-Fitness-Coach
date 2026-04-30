from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.auth_user import AuthUser
from app.models.user_profile import UserProfile
from app.repositories.auth_repository import AuthUserRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.profile import (
    UserProfileCreate,
    UserProfileRead,
    UserProfileUpdate,
)
from app.services.profile_service import ProfileNotFoundError, ProfileService

router = APIRouter(tags=["profiles"])


def get_profile_service(db: Session = Depends(get_db)) -> ProfileService:
    return ProfileService(ProfileRepository(db))


def raise_profile_not_found(error: ProfileNotFoundError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Profile with id {error.profile_id} was not found",
    )


@router.post(
    "",
    response_model=UserProfileRead,
    status_code=status.HTTP_201_CREATED,
)
def create_profile(
    profile_data: UserProfileCreate,
    profile_service: ProfileService = Depends(get_profile_service),
) -> UserProfile:
    return profile_service.create_profile(profile_data)


@router.get("", response_model=list[UserProfileRead])
def list_profiles(
    profile_service: ProfileService = Depends(get_profile_service),
) -> list[UserProfile]:
    return profile_service.list_profiles()


@router.get("/me", response_model=UserProfileRead)
def get_my_profile(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    profile_repository = ProfileRepository(db)
    profile = profile_repository.get_by_id(current_user.id)
    if profile is not None:
        return profile

    return profile_repository.create_default_for_auth_user(
        profile_id=current_user.id,
        name=current_user.name,
        age=current_user.age,
        height_cm=current_user.height_cm,
        weight_kg=current_user.weight_kg,
        fitness_goal=current_user.fitness_goal,
        experience_level=current_user.experience_level,
    )


@router.put("/me", response_model=UserProfileRead)
def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    profile_repository = ProfileRepository(db)
    auth_repository = AuthUserRepository(db)
    profile = profile_repository.get_by_id(current_user.id)
    if profile is None:
        profile = profile_repository.create_default_for_auth_user(
            profile_id=current_user.id,
            name=current_user.name,
            age=current_user.age,
            height_cm=current_user.height_cm,
            weight_kg=current_user.weight_kg,
            fitness_goal=current_user.fitness_goal,
            experience_level=current_user.experience_level,
        )

    update_data = profile_data.model_dump(exclude_unset=True)
    nullable_physical_fields = {"age", "height_cm", "weight_kg"}
    update_data = {
        key: value
        for key, value in update_data.items()
        if key not in nullable_physical_fields or value is not None
    }
    updated_profile = profile_repository.update(profile, update_data)
    auth_user_fields = {
        "age",
        "experience_level",
        "fitness_goal",
        "height_cm",
        "name",
        "weight_kg",
    }
    auth_update_data = {
        key: value
        for key, value in update_data.items()
        if key in auth_user_fields
    }
    if auth_update_data:
        auth_repository.update(current_user, auth_update_data)
    MongoActivityRepository().create_event_background(
        auth_user_id=current_user.id,
        event_type="profile_update",
        metadata={"updated_fields": sorted(update_data)},
    )
    return updated_profile


@router.get("/{profile_id}", response_model=UserProfileRead)
def get_profile(
    profile_id: int,
    profile_service: ProfileService = Depends(get_profile_service),
) -> UserProfile:
    try:
        return profile_service.get_profile(profile_id)
    except ProfileNotFoundError as error:
        raise_profile_not_found(error)


@router.put("/{profile_id}", response_model=UserProfileRead)
def update_profile(
    profile_id: int,
    profile_data: UserProfileUpdate,
    profile_service: ProfileService = Depends(get_profile_service),
) -> UserProfile:
    try:
        return profile_service.update_profile(profile_id, profile_data)
    except ProfileNotFoundError as error:
        raise_profile_not_found(error)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    profile_id: int,
    profile_service: ProfileService = Depends(get_profile_service),
) -> None:
    try:
        profile_service.delete_profile(profile_id)
    except ProfileNotFoundError as error:
        raise_profile_not_found(error)
