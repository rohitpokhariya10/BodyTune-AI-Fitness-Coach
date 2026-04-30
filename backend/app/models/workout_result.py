from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WorkoutResult(Base):
    __tablename__ = "workout_results"
    __table_args__ = (
        CheckConstraint(
            "workout_type IN ('squat', 'push_up')",
            name="ck_workout_results_workout_type",
        ),
        CheckConstraint(
            "duration_seconds >= 1",
            name="ck_workout_results_duration_seconds_min",
        ),
        CheckConstraint("total_reps >= 0", name="ck_workout_results_total_reps_min"),
        CheckConstraint(
            "correct_reps >= 0",
            name="ck_workout_results_correct_reps_min",
        ),
        CheckConstraint(
            "incorrect_reps >= 0",
            name="ck_workout_results_incorrect_reps_min",
        ),
        CheckConstraint(
            "correct_reps + incorrect_reps = total_reps",
            name="ck_workout_results_rep_totals",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workout_type: Mapped[str] = mapped_column(String(50), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    total_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    incorrect_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    primary_feedback: Mapped[str | None] = mapped_column(String(255), nullable=True)
    feedback_tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user_profile: Mapped["UserProfile"] = relationship(back_populates="workout_results")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="workout_result",
        cascade="all, delete-orphan",
    )
