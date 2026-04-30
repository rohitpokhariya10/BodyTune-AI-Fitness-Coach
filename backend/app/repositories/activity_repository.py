from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog


class ActivityRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user_date(
        self,
        user_id: int,
        activity_date: date,
    ) -> ActivityLog | None:
        statement = select(ActivityLog).where(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_date == activity_date,
        )
        return self.db.scalars(statement).first()

    def increment_activity(
        self,
        *,
        user_id: int,
        activity_date: date,
        counter_field: str | None,
        occurred_at: datetime,
    ) -> ActivityLog:
        activity_log = self.get_by_user_date(user_id, activity_date)
        if activity_log is None:
            activity_log = ActivityLog(
                activity_date=activity_date,
                activity_count=0,
                diet_log_count=0,
                last_activity_at=occurred_at,
                login_count=0,
                subscription_action_count=0,
                user_id=user_id,
                video_watch_count=0,
                workout_count=0,
            )

        activity_log.activity_count += 1
        if counter_field is not None:
            current_count = getattr(activity_log, counter_field)
            setattr(activity_log, counter_field, current_count + 1)
        activity_log.last_activity_at = occurred_at

        self.db.add(activity_log)
        self.db.commit()
        self.db.refresh(activity_log)
        return activity_log

    def list_between_dates(
        self,
        *,
        user_id: int,
        start_date: date,
        end_date: date,
    ) -> list[ActivityLog]:
        statement = (
            select(ActivityLog)
            .where(
                ActivityLog.user_id == user_id,
                ActivityLog.activity_date >= start_date,
                ActivityLog.activity_date <= end_date,
            )
            .order_by(ActivityLog.activity_date)
        )
        return list(self.db.scalars(statement).all())

    def list_active_dates(self, user_id: int) -> list[date]:
        statement = (
            select(ActivityLog.activity_date)
            .where(
                ActivityLog.user_id == user_id,
                ActivityLog.activity_count > 0,
            )
            .order_by(ActivityLog.activity_date)
        )
        return list(self.db.scalars(statement).all())

    def count_active_days(self, user_id: int) -> int:
        statement = select(func.count(ActivityLog.id)).where(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_count > 0,
        )
        return int(self.db.scalar(statement) or 0)
