from dataclasses import dataclass

from app.models.user_profile import UserProfile
from app.models.workout_result import WorkoutResult
from app.schemas.recommendation import RecommendationType


@dataclass(frozen=True)
class RecommendationRuleResult:
    recommendation_type: RecommendationType
    message: str


LOW_REP_TARGETS_BY_EXPERIENCE: dict[str, int] = {
    "beginner": 4,
    "intermediate": 6,
    "advanced": 8,
}


def generate_rule_based_recommendation(
    *,
    user_profile: UserProfile,
    workout_result: WorkoutResult,
) -> RecommendationRuleResult:
    feedback_tags = set(workout_result.feedback_tags or [])
    incorrect_ratio = (
        workout_result.incorrect_reps / workout_result.total_reps
        if workout_result.total_reps > 0
        else 0
    )

    if incorrect_ratio >= 0.3:
        return RecommendationRuleResult(
            recommendation_type="form",
            message="Reduce your pace and focus on steady form before adding more reps.",
        )

    if "shallow_depth" in feedback_tags:
        return RecommendationRuleResult(
            recommendation_type="form",
            message="Practice controlled squat depth with slower descents and a consistent range of motion.",
        )

    if "back_alignment" in feedback_tags:
        return RecommendationRuleResult(
            recommendation_type="form",
            message="Use slower reps and focus on steady torso control through each movement.",
        )

    if "incomplete_extension" in feedback_tags:
        return RecommendationRuleResult(
            recommendation_type="form",
            message="Reach full arm extension before starting the next push-up rep.",
        )

    if "body_alignment" in feedback_tags:
        return RecommendationRuleResult(
            recommendation_type="form",
            message="Maintain a straight body line throughout each push-up rep.",
        )

    low_rep_target = LOW_REP_TARGETS_BY_EXPERIENCE.get(
        user_profile.experience_level,
        LOW_REP_TARGETS_BY_EXPERIENCE["beginner"],
    )
    if workout_result.total_reps < low_rep_target:
        return RecommendationRuleResult(
            recommendation_type="consistency",
            message="Keep a manageable target next session and build consistency with controlled reps.",
        )

    if workout_result.total_reps >= 10 and incorrect_ratio <= 0.1:
        return RecommendationRuleResult(
            recommendation_type="progression",
            message="Your form was consistent, so consider a small gradual increase in volume next session.",
        )

    goal_label = user_profile.fitness_goal.replace("_", " ")
    return RecommendationRuleResult(
        recommendation_type="consistency",
        message=f"Keep your next {goal_label} session focused on controlled reps and repeatable form.",
    )
