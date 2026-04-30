from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DietLog(Base):
    __tablename__ = "diet_logs"
    __table_args__ = (
        CheckConstraint(
            "meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')",
            name="ck_diet_logs_meal_type",
        ),
        CheckConstraint("quantity > 0", name="ck_diet_logs_quantity_positive"),
        CheckConstraint("calories >= 0", name="ck_diet_logs_calories_min"),
        CheckConstraint("protein_g >= 0", name="ck_diet_logs_protein_g_min"),
        CheckConstraint("carbs_g >= 0", name="ck_diet_logs_carbs_g_min"),
        CheckConstraint("fats_g >= 0", name="ck_diet_logs_fats_g_min"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    food_item_id: Mapped[int] = mapped_column(
        ForeignKey("food_items.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fats_g: Mapped[float] = mapped_column(Float, nullable=False)
    photo_id: Mapped[int | None] = mapped_column(
        ForeignKey("meal_photos.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    food_item: Mapped["FoodItem"] = relationship(back_populates="diet_logs")
    meal_photo: Mapped["MealPhoto | None"] = relationship(back_populates="diet_logs")
    user_profile: Mapped["UserProfile"] = relationship(back_populates="diet_logs")
