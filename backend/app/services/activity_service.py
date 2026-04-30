from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Literal

from app.models.activity_log import ActivityLog
from app.repositories.activity_repository import ActivityRepository
from app.repositories.mongo_activity_repository import MongoActivityRepository

ActivityType = Literal[
    "login",
    "workout",
    "diet_log",
    "video_watch",
    "subscription",
    "general",
]

ACTIVITY_COUNTER_FIELDS: dict[str, str | None] = {
    "diet_log": "diet_log_count",
    "general": None,
    "login": "login_count",
    "subscription": "subscription_action_count",
    "video_watch": "video_watch_count",
    "workout": "workout_count",
}


class InvalidActivityTypeError(Exception):
    def __init__(self, activity_type: str) -> None:
        self.activity_type = activity_type
        super().__init__(f"Unsupported activity type: {activity_type}")


class ActivityService:
    def __init__(
        self,
        activity_repository: ActivityRepository,
        mongo_activity_repository: MongoActivityRepository | None = None,
    ) -> None:
        self.activity_repository = activity_repository
        self.mongo_activity_repository = mongo_activity_repository

    def record_activity(
        self,
        user_id: int,
        activity_type: ActivityType | str = "general",
    ) -> ActivityLog:
        counter_field = ACTIVITY_COUNTER_FIELDS.get(activity_type)
        if activity_type not in ACTIVITY_COUNTER_FIELDS:
            raise InvalidActivityTypeError(activity_type)

        now = datetime.now()
        activity_log = self.activity_repository.increment_activity(
            activity_date=now.date(),
            counter_field=counter_field,
            occurred_at=now,
            user_id=user_id,
        )
        if self.mongo_activity_repository is not None:
            self.mongo_activity_repository.create_event_background(
                auth_user_id=user_id,
                created_at=now,
                event_type=activity_type,
                metadata={},
            )
        return activity_log

    def record_login(self, user_id: int) -> ActivityLog:
        return self.record_activity(user_id, "login")

    def get_user_activity_heatmap(
        self,
        user_id: int,
        days: int = 365,
    ) -> list[dict[str, object]]:
        end_date = date.today()
        start_date = end_date - timedelta(days=max(days, 1) - 1)
        logs_by_date = {
            log.activity_date: log
            for log in self.activity_repository.list_between_dates(
                end_date=end_date,
                start_date=start_date,
                user_id=user_id,
            )
        }

        heatmap_days: list[dict[str, object]] = []
        for offset in range((end_date - start_date).days + 1):
            current_date = start_date + timedelta(days=offset)
            log = logs_by_date.get(current_date)
            count = log.activity_count if log is not None else 0
            heatmap_days.append(
                {
                    "date": current_date,
                    "count": count,
                    "level": activity_level(count),
                    "login_count": log.login_count if log is not None else 0,
                    "workout_count": log.workout_count if log is not None else 0,
                    "diet_log_count": log.diet_log_count if log is not None else 0,
                    "video_watch_count": log.video_watch_count if log is not None else 0,
                    "subscription_action_count": (
                        log.subscription_action_count if log is not None else 0
                    ),
                },
            )
        return heatmap_days

    def calculate_current_streak(self, user_id: int) -> int:
        active_dates = set(self.activity_repository.list_active_dates(user_id))
        today = date.today()
        if today not in active_dates:
            return 0

        streak = 0
        current_date = today
        while current_date in active_dates:
            streak += 1
            current_date -= timedelta(days=1)
        return streak

    def calculate_longest_streak(self, user_id: int) -> int:
        active_dates = self.activity_repository.list_active_dates(user_id)
        if not active_dates:
            return 0

        longest_streak = 1
        current_streak = 1
        previous_date = active_dates[0]
        for active_date in active_dates[1:]:
            if active_date == previous_date + timedelta(days=1):
                current_streak += 1
            else:
                longest_streak = max(longest_streak, current_streak)
                current_streak = 1
            previous_date = active_date

        return max(longest_streak, current_streak)

    def get_activity_summary(self, user_id: int) -> dict[str, int]:
        today = date.today()
        last_week = today - timedelta(days=6)
        last_month = today - timedelta(days=29)
        recent_logs = self.activity_repository.list_between_dates(
            end_date=today,
            start_date=last_month,
            user_id=user_id,
        )
        today_log = next(
            (log for log in recent_logs if log.activity_date == today),
            None,
        )

        return {
            "current_streak": self.calculate_current_streak(user_id),
            "longest_streak": self.calculate_longest_streak(user_id),
            "total_active_days": self.activity_repository.count_active_days(user_id),
            "today_activity_count": today_log.activity_count if today_log else 0,
            "weekly_activity_count": sum(
                log.activity_count
                for log in recent_logs
                if log.activity_date >= last_week
            ),
            "monthly_activity_count": sum(log.activity_count for log in recent_logs),
        }


def activity_level(count: int) -> int:
    if count <= 0:
        return 0
    if count == 1:
        return 1
    if count <= 3:
        return 2
    if count <= 6:
        return 3
    return 4
