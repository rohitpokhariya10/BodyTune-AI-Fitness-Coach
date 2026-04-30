from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint("age >= 13 AND age <= 100", name="ck_user_profiles_age_range"),
        CheckConstraint(
            "height_cm >= 80 AND height_cm <= 250",
            name="ck_user_profiles_height_cm_range",
        ),
        CheckConstraint(
            "weight_kg >= 25 AND weight_kg <= 300",
            name="ck_user_profiles_weight_kg_range",
        ),
        CheckConstraint(
            "fitness_goal IN ('general_fitness', 'strength', 'weight_loss', 'mobility')",
            name="ck_user_profiles_fitness_goal",
        ),
        CheckConstraint(
            "experience_level IN ('beginner', 'intermediate', 'advanced')",
            name="ck_user_profiles_experience_level",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    fitness_goal: Mapped[str] = mapped_column(String(50), nullable=False)
    experience_level: Mapped[str] = mapped_column(String(50), nullable=False)
    calorie_goal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_goal_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    carbs_goal_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fats_goal_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workout_results: Mapped[list["WorkoutResult"]] = relationship(
        back_populates="user_profile",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="user_profile",
        cascade="all, delete-orphan",
    )
    diet_logs: Mapped[list["DietLog"]] = relationship(
        back_populates="user_profile",
        cascade="all, delete-orphan",
    )
    meal_photos: Mapped[list["MealPhoto"]] = relationship(
        back_populates="user_profile",
        cascade="all, delete-orphan",
    )
