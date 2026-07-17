import {
  generateWorkoutRecommendation,
  WORKOUT_RECOMMENDATION_RULES_VERSION,
} from './workout-recommendation.rules';
import type { WorkoutRecommendationInput } from './workout-recommendation.rules';

const baseInput: WorkoutRecommendationInput = {
  correctReps: 8,
  feedbackTags: [],
  incorrectReps: 2,
  totalReps: 10,
  workoutType: 'squat',
};

describe('workout recommendation rules', () => {
  it('prioritizes a high incorrect-rep ratio', () => {
    const recommendation = generateWorkoutRecommendation({
      ...baseInput,
      correctReps: 6,
      incorrectReps: 4,
    });

    expect(recommendation.type).toBe('form');
    expect(recommendation.message).toContain('Reduce your pace');
  });

  it.each([
    ['squat', 'shallow_depth', 'squat depth'],
    ['push_up', 'body_alignment', 'straight body line'],
    ['crunch', 'incomplete_crunch', 'shoulders'],
    ['bicep_curl', 'unstable_upper_arm', 'upper arm'],
  ] as const)('returns specific %s guidance for %s', (workoutType, tag, messagePart) => {
    const recommendation = generateWorkoutRecommendation({
      ...baseInput,
      feedbackTags: [tag],
      workoutType,
    });

    expect(recommendation.type).toBe('form');
    expect(recommendation.message).toContain(messagePart);
    expect(recommendation.rulesVersion).toBe(WORKOUT_RECOMMENDATION_RULES_VERSION);
  });

  it('uses exercise-specific extension guidance', () => {
    const curl = generateWorkoutRecommendation({
      ...baseInput,
      feedbackTags: ['incomplete_extension'],
      workoutType: 'bicep_curl',
    });
    const pushUp = generateWorkoutRecommendation({
      ...baseInput,
      feedbackTags: ['incomplete_extension'],
      workoutType: 'push_up',
    });

    expect(curl.message).toContain('curl');
    expect(pushUp.message).toContain('push-up');
  });

  it('returns consistency for a small session and progression for controlled volume', () => {
    expect(
      generateWorkoutRecommendation({
        ...baseInput,
        correctReps: 3,
        incorrectReps: 0,
        totalReps: 3,
      }).type,
    ).toBe('consistency');
    expect(
      generateWorkoutRecommendation({
        ...baseInput,
        correctReps: 10,
        incorrectReps: 0,
      }).type,
    ).toBe('progression');
  });

  it('does not produce diagnosis or injury-prediction language', () => {
    const messages = [
      generateWorkoutRecommendation({ ...baseInput, feedbackTags: ['back_alignment'] }),
      generateWorkoutRecommendation({ ...baseInput, feedbackTags: ['unstable_movement'] }),
      generateWorkoutRecommendation({
        ...baseInput,
        feedbackTags: ['arm_not_visible'],
        workoutType: 'bicep_curl',
      }),
    ].map((recommendation) => recommendation.message.toLowerCase());

    expect(messages.join(' ')).not.toMatch(/diagnos|disease|injury|predict|prevention/);
  });
});
