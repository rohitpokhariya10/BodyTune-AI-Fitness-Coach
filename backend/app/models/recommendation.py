from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Recommendation(Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        CheckConstraint(
            "recommendation_type IN ('form', 'volume', 'consistency', 'progression')",
            name="ck_recommendations_recommendation_type",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workout_result_id: Mapped[int] = mapped_column(
        ForeignKey("workout_results.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recommendation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user_profile: Mapped["UserProfile"] = relationship(back_populates="recommendations")
    workout_result: Mapped["WorkoutResult"] = relationship(
        back_populates="recommendations",
    )
