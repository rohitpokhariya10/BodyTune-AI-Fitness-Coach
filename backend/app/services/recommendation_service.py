from app.models.recommendation import Recommendation
from app.repositories.profile_repository import ProfileRepository
from app.repositories.recommendation_repository import RecommendationRepository
from app.repositories.workout_result_repository import WorkoutResultRepository
from app.rules.recommendation_rules import generate_rule_based_recommendation
from app.schemas.recommendation import RecommendationCreate


class RecommendationNotFoundError(Exception):
    def __init__(self, recommendation_id: int) -> None:
        self.recommendation_id = recommendation_id
        super().__init__(f"Recommendation with id {recommendation_id} was not found")


class RecommendationUserNotFoundError(Exception):
    def __init__(self, user_id: int) -> None:
        self.user_id = user_id
        super().__init__(f"User profile with id {user_id} was not found")


class RecommendationWorkoutResultNotFoundError(Exception):
    def __init__(self, workout_result_id: int) -> None:
        self.workout_result_id = workout_result_id
        super().__init__(f"Workout result with id {workout_result_id} was not found")


class RecommendationOwnershipError(Exception):
    def __init__(self, user_id: int, workout_result_id: int) -> None:
        self.user_id = user_id
        self.workout_result_id = workout_result_id
        super().__init__(
            f"Workout result {workout_result_id} does not belong to user {user_id}",
        )


class RecommendationService:
    def __init__(
        self,
        recommendation_repository: RecommendationRepository,
        profile_repository: ProfileRepository,
        workout_result_repository: WorkoutResultRepository,
    ) -> None:
        self.recommendation_repository = recommendation_repository
        self.profile_repository = profile_repository
        self.workout_result_repository = workout_result_repository

    def generate_recommendation(
        self,
        recommendation_data: RecommendationCreate,
    ) -> Recommendation:
        user_profile = self.profile_repository.get_by_id(recommendation_data.user_id)
        if user_profile is None:
            raise RecommendationUserNotFoundError(recommendation_data.user_id)

        workout_result = self.workout_result_repository.get_by_id(
            recommendation_data.workout_result_id,
        )
        if workout_result is None:
            raise RecommendationWorkoutResultNotFoundError(
                recommendation_data.workout_result_id,
            )

        if workout_result.user_id != user_profile.id:
            raise RecommendationOwnershipError(
                user_id=user_profile.id,
                workout_result_id=workout_result.id,
            )

        rule_result = generate_rule_based_recommendation(
            user_profile=user_profile,
            workout_result=workout_result,
        )
        return self.recommendation_repository.create(
            user_id=user_profile.id,
            workout_result_id=workout_result.id,
            recommendation_type=rule_result.recommendation_type,
            message=rule_result.message,
        )

    def get_recommendation(self, recommendation_id: int) -> Recommendation:
        recommendation = self.recommendation_repository.get_by_id(recommendation_id)
        if recommendation is None:
            raise RecommendationNotFoundError(recommendation_id)
        return recommendation

    def list_recommendations_for_user(self, user_id: int) -> list[Recommendation]:
        if self.profile_repository.get_by_id(user_id) is None:
            raise RecommendationUserNotFoundError(user_id)
        return self.recommendation_repository.list_by_user_id(user_id)

    def list_recommendations(self) -> list[Recommendation]:
        return self.recommendation_repository.list_all()

    def delete_recommendation(self, recommendation_id: int) -> None:
        recommendation = self.get_recommendation(recommendation_id)
        self.recommendation_repository.delete(recommendation)
