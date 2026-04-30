from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "activity_date",
            name="uq_activity_logs_user_date",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("auth_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    activity_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    workout_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    diet_log_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    video_watch_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subscription_action_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
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
