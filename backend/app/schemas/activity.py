from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

ActivityType = Literal[
    "login",
    "workout",
    "diet_log",
    "video_watch",
    "subscription",
    "general",
]


class ActivitySummaryResponse(BaseModel):
    current_streak: int
    longest_streak: int
    total_active_days: int
    today_activity_count: int
    weekly_activity_count: int
    monthly_activity_count: int


class ActivityHeatmapDay(BaseModel):
    date: date
    count: int
    level: int
    login_count: int
    workout_count: int
    diet_log_count: int
    video_watch_count: int
    subscription_action_count: int


class ActivityHeatmapResponse(BaseModel):
    days: list[ActivityHeatmapDay]


class ActivityRecordRequest(BaseModel):
    activity_type: ActivityType = "general"


class ActivityVideoWatchRequest(BaseModel):
    video_id: int | None = Field(default=None, ge=1)


class ActivityRecordResponse(BaseModel):
    activity_type: ActivityType
    activity_count: int
    message: str
