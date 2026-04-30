from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FoodItem(Base):
    __tablename__ = "food_items"
    __table_args__ = (
        CheckConstraint(
            "calories_per_serving >= 0",
            name="ck_food_items_calories_per_serving_min",
        ),
        CheckConstraint("protein_g >= 0", name="ck_food_items_protein_g_min"),
        CheckConstraint("carbs_g >= 0", name="ck_food_items_carbs_g_min"),
        CheckConstraint("fats_g >= 0", name="ck_food_items_fats_g_min"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    aliases: Mapped[str] = mapped_column(String(600), nullable=False, default="")
    serving_unit: Mapped[str] = mapped_column(String(60), nullable=False)
    calories_per_serving: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=False)
    fats_g: Mapped[float] = mapped_column(Float, nullable=False)
    is_custom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    diet_logs: Mapped[list["DietLog"]] = relationship(back_populates="food_item")
