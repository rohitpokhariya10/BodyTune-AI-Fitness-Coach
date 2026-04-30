from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MealPhoto(Base):
    __tablename__ = "meal_photos"
    __table_args__ = (
        CheckConstraint(
            "analysis_status IN ('uploaded', 'needs_confirmation', 'confirmed')",
            name="ck_meal_photos_analysis_status",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    analysis_status: Mapped[str] = mapped_column(
        String(40),
        default="needs_confirmation",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user_profile: Mapped["UserProfile"] = relationship(back_populates="meal_photos")
    diet_logs: Mapped[list["DietLog"]] = relationship(back_populates="meal_photo")
