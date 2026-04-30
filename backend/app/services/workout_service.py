from datetime import date, timedelta

from app.models.workout_result import WorkoutResult
from app.repositories.profile_repository import ProfileRepository
from app.repositories.workout_result_repository import WorkoutResultRepository
from app.schemas.result import (
    ExerciseWorkoutSummary,
    WorkoutResultCreate,
    WorkoutSummaryResponse,
)


SUPPORTED_EXERCISES: tuple[tuple[str, str], ...] = (
    ("squat", "Squat"),
    ("push_up", "Push-up"),
    ("crunch", "Crunch"),
    ("bicep_curl", "Bicep Curl"),
    ("plank", "Plank"),
    ("lunges", "Lunges"),
    ("mountain_climbers", "Mountain Climbers"),
    ("jumping_jacks", "Jumping Jacks"),
)


class WorkoutResultNotFoundError(Exception):
    def __init__(self, result_id: int) -> None:
        self.result_id = result_id
        super().__init__(f"Workout result with id {result_id} was not found")


class WorkoutResultUserNotFoundError(Exception):
    def __init__(self, user_id: int) -> None:
        self.user_id = user_id
        super().__init__(f"User profile with id {user_id} was not found")


class WorkoutService:
    def __init__(
        self,
        workout_result_repository: WorkoutResultRepository,
        profile_repository: ProfileRepository,
    ) -> None:
        self.workout_result_repository = workout_result_repository
        self.profile_repository = profile_repository

    def create_result(self, result_data: WorkoutResultCreate) -> WorkoutResult:
        self._ensure_user_exists(result_data.user_id)
        return self.workout_result_repository.create(result_data)

    def get_result(self, result_id: int) -> WorkoutResult:
        result = self.workout_result_repository.get_by_id(result_id)
        if result is None:
            raise WorkoutResultNotFoundError(result_id)
        return result

    def list_results_for_user(self, user_id: int) -> list[WorkoutResult]:
        self._ensure_user_exists(user_id)
        return self.workout_result_repository.list_by_user_id(user_id)

    def list_results(self) -> list[WorkoutResult]:
        return self.workout_result_repository.list_all()

    def get_summary_for_user(self, user_id: int) -> WorkoutSummaryResponse:
        results = self.workout_result_repository.list_by_user_id(user_id)
        recent_results = sorted(
            results,
            key=lambda result: (result.created_at, result.id),
            reverse=True,
        )
        session_scores = [form_score(result) for result in results]

        return WorkoutSummaryResponse(
            total_sessions=len(results),
            total_reps=sum(result.total_reps for result in results),
            best_score=max(session_scores) if session_scores else 0,
            average_form_score=round(sum(session_scores) / len(session_scores))
            if session_scores
            else 0,
            active_streak=workout_active_streak(results),
            exercise_stats=[
                self._exercise_summary(exercise_key, exercise_name, results)
                for exercise_key, exercise_name in SUPPORTED_EXERCISES
            ],
            recent_sessions=recent_results[:5],
        )

    def delete_result(self, result_id: int) -> None:
        result = self.get_result(result_id)
        self.workout_result_repository.delete(result)

    def _ensure_user_exists(self, user_id: int) -> None:
        if self.profile_repository.get_by_id(user_id) is None:
            raise WorkoutResultUserNotFoundError(user_id)

    def _exercise_summary(
        self,
        exercise_key: str,
        exercise_name: str,
        results: list[WorkoutResult],
    ) -> ExerciseWorkoutSummary:
        exercise_results = [
            result for result in results if result.workout_type == exercise_key
        ]
        recent_results = sorted(
            exercise_results,
            key=lambda result: (result.created_at, result.id),
            reverse=True,
        )
        scores = [form_score(result) for result in exercise_results]

        return ExerciseWorkoutSummary(
            exercise_key=exercise_key,
            exercise_name=exercise_name,
            total_sessions=len(exercise_results),
            total_reps=sum(result.total_reps for result in exercise_results),
            last_score=form_score(recent_results[0]) if recent_results else None,
            best_score=max(scores) if scores else None,
            average_score=round(sum(scores) / len(scores)) if scores else None,
            last_session_at=recent_results[0].created_at if recent_results else None,
        )


def form_score(result: WorkoutResult) -> int:
    return round((result.correct_reps / result.total_reps) * 100) if result.total_reps else 0


def workout_active_streak(results: list[WorkoutResult]) -> int:
    workout_dates = {result.created_at.date() for result in results}
    today = date.today()
    if today not in workout_dates:
        return 0

    streak = 0
    current_date = today
    while current_date in workout_dates:
        streak += 1
        current_date -= timedelta(days=1)
    return streak
