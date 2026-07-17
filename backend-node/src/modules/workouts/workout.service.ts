import { ConflictError } from '../../errors/ConflictError';
import { NotFoundError } from '../../errors/NotFoundError';
import { generateWorkoutRecommendation } from './workout-recommendation.rules';
import type { WorkoutRepository } from './workout.repository';
import {
  WORKOUT_TYPES,
  type CompleteWorkoutInput,
  type CompleteWorkoutResult,
  type WorkoutExerciseSummary,
  type WorkoutListQuery,
  type WorkoutSessionPage,
  type WorkoutSessionRecord,
  type WorkoutSummary,
} from './workout.types';
import { authenticatedWorkoutUserIdSchema } from './workout.validation';

export type WorkoutClock = () => Date;

export const calculateCanonicalFormScore = (correctReps: number, totalReps: number): number =>
  totalReps === 0 ? 0 : Math.round((correctReps / totalReps) * 100);

const utcDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const subtractUtcDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
};

export const calculateActiveStreak = (activeDates: readonly string[], now: Date): number => {
  const dates = new Set(activeDates);
  let cursor = now;
  let streak = 0;

  while (dates.has(utcDateKey(cursor))) {
    streak += 1;
    cursor = subtractUtcDays(cursor, 1);
  }

  return streak;
};

const emptyExerciseSummary = (
  workoutType: WorkoutExerciseSummary['workoutType'],
): WorkoutExerciseSummary => ({
  averageScore: null,
  bestScore: null,
  lastScore: null,
  lastSessionAt: null,
  totalReps: 0,
  totalSessions: 0,
  workoutType,
});

const sameFeedbackTags = (actual: readonly string[], expected: readonly string[]): boolean => {
  if (actual.length !== expected.length) {
    return false;
  }

  const actualTags = [...actual].sort();
  const expectedTags = [...expected].sort();
  return actualTags.every((tag, index) => tag === expectedTags[index]);
};

const isMatchingIdempotentReplay = (
  input: CompleteWorkoutInput,
  session: WorkoutSessionRecord,
): boolean =>
  session.clientSessionId.toLowerCase() === input.clientSessionId.toLowerCase() &&
  session.clientFormScore === input.clientFormScore &&
  session.correctReps === input.correctReps &&
  session.durationSeconds === input.durationSeconds &&
  sameFeedbackTags(session.feedbackTags, input.feedbackTags) &&
  session.incorrectReps === input.incorrectReps &&
  session.poseEngine.modelVersion === input.poseEngine.modelVersion &&
  session.poseEngine.packageVersion === input.poseEngine.packageVersion &&
  session.poseEngine.workoutRulesVersion === input.poseEngine.workoutRulesVersion &&
  session.primaryFeedback === input.primaryFeedback &&
  session.totalReps === input.totalReps &&
  session.workoutType === input.workoutType;

export class WorkoutService {
  public constructor(
    private readonly repository: WorkoutRepository,
    private readonly clock: WorkoutClock = () => new Date(),
  ) {}

  public async completeWorkout(
    authenticatedUserId: string,
    input: CompleteWorkoutInput,
  ): Promise<CompleteWorkoutResult> {
    const userId = authenticatedWorkoutUserIdSchema.parse(authenticatedUserId);
    const completedAt = this.clock();
    const recommendation = generateWorkoutRecommendation({
      correctReps: input.correctReps,
      feedbackTags: input.feedbackTags,
      incorrectReps: input.incorrectReps,
      totalReps: input.totalReps,
      workoutType: input.workoutType,
    });

    const result = await this.repository.completeIdempotently({
      ...input,
      canonicalFormScore: calculateCanonicalFormScore(input.correctReps, input.totalReps),
      completedAt,
      recommendation,
      status: 'completed',
      userId,
    });

    if (!result.created && !isMatchingIdempotentReplay(input, result.session)) {
      throw new ConflictError('client_session_id has already been used for another workout');
    }

    return result;
  }

  public async getOwnedSession(
    authenticatedUserId: string,
    sessionId: string,
  ): Promise<WorkoutSessionRecord> {
    const userId = authenticatedWorkoutUserIdSchema.parse(authenticatedUserId);
    const session = await this.repository.findOwnedById(userId, sessionId);

    if (session === null) {
      throw new NotFoundError('Workout session not found');
    }

    return session;
  }

  public async listOwnedSessions(
    authenticatedUserId: string,
    query: WorkoutListQuery,
  ): Promise<WorkoutSessionPage> {
    const userId = authenticatedWorkoutUserIdSchema.parse(authenticatedUserId);
    return this.repository.listOwned(userId, query);
  }

  public async deleteOwnedSession(authenticatedUserId: string, sessionId: string): Promise<void> {
    const userId = authenticatedWorkoutUserIdSchema.parse(authenticatedUserId);
    const deleted = await this.repository.softDeleteOwned(userId, sessionId);

    if (!deleted) {
      throw new NotFoundError('Workout session not found');
    }
  }

  public async getOwnedSummary(authenticatedUserId: string): Promise<WorkoutSummary> {
    const userId = authenticatedWorkoutUserIdSchema.parse(authenticatedUserId);
    const snapshot = await this.repository.summarizeOwned(userId);
    const existingByType = new Map(
      snapshot.exerciseStats.map((summary) => [summary.workoutType, summary]),
    );

    return {
      activeStreak: calculateActiveStreak(snapshot.activeDates, this.clock()),
      averageFormScore: snapshot.averageFormScore,
      bestScore: snapshot.bestScore,
      exerciseStats: WORKOUT_TYPES.map(
        (workoutType) => existingByType.get(workoutType) ?? emptyExerciseSummary(workoutType),
      ),
      recentSessions: snapshot.recentSessions,
      totalReps: snapshot.totalReps,
      totalSessions: snapshot.totalSessions,
    };
  }
}
