from datetime import datetime

from pydantic import BaseModel

from app.schemas.auth import UserRole
from app.schemas.subscription import UserSubscriptionRead


class DashboardUser(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole


class DashboardProfile(BaseModel):
    age: int | None
    height_cm: float | None
    weight_kg: float | None
    fitness_goal: str
    experience_level: str
    calorie_goal: int | None
    protein_goal_g: int | None
    carbs_goal_g: int | None
    fats_goal_g: int | None


class NutritionDashboardSummary(BaseModel):
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fats_g: float
    calorie_goal: int | None
    protein_goal_g: int | None
    carbs_goal_g: int | None
    fats_goal_g: int | None
    calories_remaining: float | None
    meals_logged_today: int
    goal_is_set: bool


class WorkoutSessionSummary(BaseModel):
    id: int
    workout_type: str
    duration_seconds: int
    total_reps: int
    correct_reps: int
    incorrect_reps: int
    form_score: int
    primary_feedback: str | None
    feedback_tags: list[str]
    created_at: datetime


class WorkoutDashboardSummary(BaseModel):
    total_sessions: int
    total_reps: int
    average_form_score: int
    best_score: int
    latest_session: WorkoutSessionSummary | None
    recent_sessions: list[WorkoutSessionSummary]


class ActivityDashboardSummary(BaseModel):
    current_streak: int
    longest_streak: int
    today_activity_count: int
    total_active_days: int


class DashboardInsight(BaseModel):
    title: str
    message: str
    focus_area: str


class DashboardSummaryResponse(BaseModel):
    user: DashboardUser
    profile: DashboardProfile
    nutrition: NutritionDashboardSummary
    workouts: WorkoutDashboardSummary
    activity: ActivityDashboardSummary
    subscription: UserSubscriptionRead
    insight: DashboardInsight


class AdminSummaryResponse(BaseModel):
    total_users: int
    verified_users: int
    admin_users: int
    total_videos: int
    active_videos: int
    premium_videos: int
    total_plans: int
    total_subscriptions: int
