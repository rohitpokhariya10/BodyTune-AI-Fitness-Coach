from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExerciseVideo(Base):
    __tablename__ = "exercise_videos"
    __table_args__ = (
        CheckConstraint(
            "difficulty IN ('beginner', 'intermediate', 'advanced')",
            name="ck_exercise_videos_difficulty",
        ),
        CheckConstraint(
            "duration_minutes >= 1",
            name="ck_exercise_videos_duration_minutes_min",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    target_muscles: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    equipment: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    video_url: Mapped[str] = mapped_column(String(600), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(600), default="", nullable=False)
    imagekit_video_file_id: Mapped[str] = mapped_column(
        String(160),
        default="",
        nullable=False,
    )
    imagekit_thumbnail_file_id: Mapped[str] = mapped_column(
        String(160),
        default="",
        nullable=False,
    )
    is_premium: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )
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
