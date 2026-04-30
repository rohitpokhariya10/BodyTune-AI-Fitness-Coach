from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user_profile import UserProfile
from app.schemas.profile import UserProfileCreate


class ProfileRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, profile_data: UserProfileCreate) -> UserProfile:
        profile = UserProfile(**profile_data.model_dump())
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def create_default_for_auth_user(
        self,
        *,
        profile_id: int,
        name: str,
        age: int | None = None,
        height_cm: float | None = None,
        weight_kg: float | None = None,
        fitness_goal: str | None = None,
        experience_level: str | None = None,
        calorie_goal: int | None = None,
        protein_goal_g: int | None = None,
        carbs_goal_g: int | None = None,
        fats_goal_g: int | None = None,
    ) -> UserProfile:
        existing_profile = self.get_by_id(profile_id)
        if existing_profile is not None:
            return existing_profile

        profile = UserProfile(
            id=profile_id,
            name=name,
            age=age or 24,
            height_cm=height_cm or 170.0,
            weight_kg=weight_kg or 70.0,
            fitness_goal=fitness_goal or "general_fitness",
            experience_level=experience_level or "beginner",
            calorie_goal=calorie_goal,
            protein_goal_g=protein_goal_g,
            carbs_goal_g=carbs_goal_g,
            fats_goal_g=fats_goal_g,
        )
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_by_id(self, profile_id: int) -> UserProfile | None:
        return self.db.get(UserProfile, profile_id)

    def update(self, profile: UserProfile, update_data: dict[str, Any]) -> UserProfile:
        for field, value in update_data.items():
            setattr(profile, field, value)
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def delete(self, profile: UserProfile) -> None:
        self.db.delete(profile)
        self.db.commit()

    def list(self) -> list[UserProfile]:
        statement = select(UserProfile).order_by(UserProfile.id)
        return list(self.db.scalars(statement).all())
