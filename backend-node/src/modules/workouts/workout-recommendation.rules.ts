import type { WorkoutRecommendationSnapshot, WorkoutType } from './workout.types';

export const WORKOUT_RECOMMENDATION_RULES_VERSION = '1';

export interface WorkoutRecommendationInput {
  correctReps: number;
  feedbackTags: readonly string[];
  incorrectReps: number;
  totalReps: number;
  workoutType: WorkoutType;
}

const formRecommendation = (message: string): WorkoutRecommendationSnapshot => ({
  message,
  rulesVersion: WORKOUT_RECOMMENDATION_RULES_VERSION,
  type: 'form',
});

export const generateWorkoutRecommendation = ({
  feedbackTags,
  incorrectReps,
  totalReps,
  workoutType,
}: WorkoutRecommendationInput): WorkoutRecommendationSnapshot => {
  const tags = new Set(feedbackTags);
  const incorrectRatio = totalReps > 0 ? incorrectReps / totalReps : 0;

  if (incorrectRatio >= 0.3) {
    return formRecommendation('Reduce your pace and focus on steady form before adding more reps.');
  }

  if (tags.has('shallow_depth')) {
    return formRecommendation(
      'Practice controlled squat depth with slower descents and a consistent range of motion.',
    );
  }

  if (tags.has('back_alignment')) {
    return formRecommendation(
      'Use slower reps and focus on steady torso control through each movement.',
    );
  }

  if (tags.has('body_alignment')) {
    return formRecommendation('Maintain a straight body line throughout each push-up rep.');
  }

  if (tags.has('incomplete_depth')) {
    return formRecommendation('Use a controlled pace and complete the intended push-up depth.');
  }

  if (tags.has('incomplete_crunch')) {
    return formRecommendation(
      'Use a controlled range and lift your shoulders consistently on each crunch.',
    );
  }

  if (tags.has('unstable_upper_arm')) {
    return formRecommendation('Keep your upper arm steady while you curl and extend the elbow.');
  }

  if (tags.has('incomplete_curl')) {
    return formRecommendation('Use a controlled range and complete the curl before lowering.');
  }

  if (tags.has('incomplete_extension')) {
    return formRecommendation(
      workoutType === 'bicep_curl'
        ? 'Return to a controlled arm extension before beginning the next curl.'
        : 'Reach controlled arm extension before beginning the next push-up rep.',
    );
  }

  if (tags.has('unstable_movement')) {
    return formRecommendation('Slow the movement and keep each repetition steady and repeatable.');
  }

  if (tags.has('arm_not_visible')) {
    return formRecommendation(
      'Adjust the camera so your shoulder, elbow, and wrist remain visible throughout each curl.',
    );
  }

  if (totalReps < 4) {
    return {
      message: 'Keep a manageable target next session and build consistency with controlled reps.',
      rulesVersion: WORKOUT_RECOMMENDATION_RULES_VERSION,
      type: 'consistency',
    };
  }

  if (totalReps >= 10 && incorrectRatio <= 0.1) {
    return {
      message:
        'Your form was consistent, so consider a small gradual increase in volume next session.',
      rulesVersion: WORKOUT_RECOMMENDATION_RULES_VERSION,
      type: 'progression',
    };
  }

  return {
    message: 'Keep your next session focused on controlled reps and repeatable form.',
    rulesVersion: WORKOUT_RECOMMENDATION_RULES_VERSION,
    type: 'consistency',
  };
};
