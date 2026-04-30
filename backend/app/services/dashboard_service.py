from __future__ import annotations

from datetime import date

from app.models.auth_user import AuthUser
from app.models.diet_log import DietLog
from app.models.user_profile import UserProfile
from app.models.workout_result import WorkoutResult
from app.repositories.diet_log_repository import DietLogRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.workout_result_repository import WorkoutResultRepository
from app.schemas.dashboard import (
    ActivityDashboardSummary,
    DashboardInsight,
    DashboardProfile,
    DashboardSummaryResponse,
    DashboardUser,
    NutritionDashboardSummary,
    WorkoutDashboardSummary,
    WorkoutSessionSummary,
)
from app.services.activity_service import ActivityService
from app.services.subscription_service import SubscriptionService

class DashboardService:
    def __init__(
        self,
        *,
        activity_service: ActivityService,
        diet_log_repository: DietLogRepository,
        profile_repository: ProfileRepository,
        subscription_repository: SubscriptionRepository,
        workout_result_repository: WorkoutResultRepository,
    ) -> None:
        self.activity_service = activity_service
        self.diet_log_repository = diet_log_repository
        self.profile_repository = profile_repository
        self.subscription_service = SubscriptionService(subscription_repository)
        self.workout_result_repository = workout_result_repository

    def get_summary(self, user: AuthUser) -> DashboardSummaryResponse:
        profile = self.profile_repository.get_by_id(user.id)
        nutrition = self._nutrition_summary(user.id, profile)
        workouts = self._workout_summary(user.id)
        activity = self._activity_summary(user.id)
        subscription = self.subscription_service.get_user_subscription(user.id)

        return DashboardSummaryResponse(
            user=DashboardUser(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role,
            ),
            profile=self._profile_summary(user, profile),
            nutrition=nutrition,
            workouts=workouts,
            activity=activity,
            subscription=subscription,
            insight=self._insight(nutrition, workouts, activity),
        )

    def _nutrition_summary(
        self,
        user_id: int,
        profile: UserProfile | None,
    ) -> NutritionDashboardSummary:
        logs = self.diet_log_repository.list_by_user_id(user_id)
        today = date.today()
        today_logs = [log for log in logs if log.logged_at.date() == today]

        total_calories = sum(log.calories for log in today_logs)
        total_protein = sum(log.protein_g for log in today_logs)
        total_carbs = sum(log.carbs_g for log in today_logs)
        total_fats = sum(log.fats_g for log in today_logs)

        calorie_goal = profile.calorie_goal if profile is not None else None
        protein_goal = profile.protein_goal_g if profile is not None else None
        carbs_goal = profile.carbs_goal_g if profile is not None else None
        fats_goal = profile.fats_goal_g if profile is not None else None
        calories_remaining = (
            round(max(0, calorie_goal - total_calories), 1)
            if calorie_goal is not None
            else None
        )

        return NutritionDashboardSummary(
            total_calories=round(total_calories, 1),
            total_protein_g=round(total_protein, 1),
            total_carbs_g=round(total_carbs, 1),
            total_fats_g=round(total_fats, 1),
            calorie_goal=calorie_goal,
            protein_goal_g=protein_goal,
            carbs_goal_g=carbs_goal,
            fats_goal_g=fats_goal,
            calories_remaining=calories_remaining,
            meals_logged_today=len(today_logs),
            goal_is_set=calorie_goal is not None,
        )

    def _workout_summary(self, user_id: int) -> WorkoutDashboardSummary:
        results = self.workout_result_repository.list_by_user_id(user_id)
        recent_results = sorted(
            results,
            key=lambda result: (result.created_at, result.id),
            reverse=True,
        )
        total_reps = sum(result.total_reps for result in results)
        total_correct_reps = sum(result.correct_reps for result in results)
        average_form_score = (
            round((total_correct_reps / total_reps) * 100) if total_reps else 0
        )
        recent_sessions = [
            self._session_summary(result) for result in recent_results[:5]
        ]

        return WorkoutDashboardSummary(
            total_sessions=len(results),
            total_reps=total_reps,
            average_form_score=average_form_score,
            best_score=max((self._form_score(result) for result in results), default=0),
            latest_session=recent_sessions[0] if recent_sessions else None,
            recent_sessions=recent_sessions,
        )

    def _profile_summary(
        self,
        user: AuthUser,
        profile: UserProfile | None,
    ) -> DashboardProfile:
        return DashboardProfile(
            age=profile.age if profile is not None else user.age,
            height_cm=profile.height_cm if profile is not None else user.height_cm,
            weight_kg=profile.weight_kg if profile is not None else user.weight_kg,
            fitness_goal=(
                profile.fitness_goal
                if profile is not None
                else user.fitness_goal
            )
            or "general_fitness",
            experience_level=(
                profile.experience_level
                if profile is not None
                else user.experience_level
            )
            or "beginner",
            calorie_goal=profile.calorie_goal if profile is not None else None,
            protein_goal_g=profile.protein_goal_g if profile is not None else None,
            carbs_goal_g=profile.carbs_goal_g if profile is not None else None,
            fats_goal_g=profile.fats_goal_g if profile is not None else None,
        )

    def _activity_summary(self, user_id: int) -> ActivityDashboardSummary:
        summary = self.activity_service.get_activity_summary(user_id)
        return ActivityDashboardSummary(
            current_streak=summary["current_streak"],
            longest_streak=summary["longest_streak"],
            today_activity_count=summary["today_activity_count"],
            total_active_days=summary["total_active_days"],
        )

    def _session_summary(self, result: WorkoutResult) -> WorkoutSessionSummary:
        form_score = self._form_score(result)
        return WorkoutSessionSummary(
            id=result.id,
            workout_type=result.workout_type,
            duration_seconds=result.duration_seconds,
            total_reps=result.total_reps,
            correct_reps=result.correct_reps,
            incorrect_reps=result.incorrect_reps,
            form_score=form_score,
            primary_feedback=result.primary_feedback,
            feedback_tags=result.feedback_tags,
            created_at=result.created_at,
        )

    def _form_score(self, result: WorkoutResult) -> int:
        return (
            round((result.correct_reps / result.total_reps) * 100)
            if result.total_reps
            else 0
        )

    def _insight(
        self,
        nutrition: NutritionDashboardSummary,
        workouts: WorkoutDashboardSummary,
        activity: ActivityDashboardSummary,
    ) -> DashboardInsight:
        has_nutrition = nutrition.meals_logged_today > 0
        has_workouts = workouts.total_sessions > 0

        if not has_nutrition and not has_workouts and activity.total_active_days == 0:
            return DashboardInsight(
                title="Start your first session",
                message="Log a meal or complete a workout to generate personalized insights.",
                focus_area="Build consistency",
            )

        if (
            has_nutrition
            and nutrition.protein_goal_g is not None
            and nutrition.total_protein_g < nutrition.protein_goal_g * 0.6
        ):
            return DashboardInsight(
                title="Add more protein today",
                message="Your logged meals are below the protein target. Add a protein-rich food to support recovery.",
                focus_area="Nutrition balance",
            )

        if has_workouts and workouts.average_form_score < 75:
            return DashboardInsight(
                title="Focus on movement quality",
                message="Recent saved sessions show room to improve form. Slow the reps down and keep posture steady.",
                focus_area="Posture and control",
            )

        if activity.current_streak > 0:
            return DashboardInsight(
                title="Keep the streak alive",
                message="You have activity recorded today. A small meal log, workout, or video watch will keep momentum strong.",
                focus_area="Daily consistency",
            )

        return DashboardInsight(
            title="One action starts today",
            message="Record a meal or finish a workout to update your dashboard with fresh signals.",
            focus_area="Next best action",
        )
