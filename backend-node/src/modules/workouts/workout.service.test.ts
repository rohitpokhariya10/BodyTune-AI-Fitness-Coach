import { ConflictError } from '../../errors/ConflictError';
import { NotFoundError } from '../../errors/NotFoundError';
import type { WorkoutRepository } from './workout.repository';
import {
  calculateActiveStreak,
  calculateCanonicalFormScore,
  WorkoutService,
} from './workout.service';
import type {
  CompleteWorkoutInput,
  WorkoutSessionRecord,
  WorkoutSummarySnapshot,
} from './workout.types';

const fixedNow = new Date('2026-07-18T10:00:00.000Z');

const validInput: CompleteWorkoutInput = {
  clientFormScore: 84,
  clientSessionId: '550e8400-e29b-41d4-a716-446655440000',
  correctReps: 8,
  durationSeconds: 90,
  feedbackTags: ['back_alignment'],
  incorrectReps: 2,
  poseEngine: {
    modelName: 'pose_landmarker_lite_float16',
    modelVersion: '2026.07.1',
    name: 'mediapipe_pose_landmarker',
    packageVersion: '0.10.34',
    workoutRulesVersion: '1',
  },
  primaryFeedback: 'Keep your torso steady',
  totalReps: 10,
  workoutType: 'squat',
};

const sessionRecord = (overrides: Partial<WorkoutSessionRecord> = {}): WorkoutSessionRecord => ({
  ...validInput,
  canonicalFormScore: 80,
  completedAt: fixedNow,
  createdAt: fixedNow,
  deletedAt: null,
  id: '507f1f77bcf86cd799439011',
  recommendation: {
    message: 'Use slower reps.',
    rulesVersion: '1',
    type: 'form',
  },
  status: 'completed',
  updatedAt: fixedNow,
  userId: 'user-1',
  ...overrides,
});

const createRepository = (): jest.Mocked<WorkoutRepository> => ({
  completeIdempotently: jest.fn(),
  findOwnedById: jest.fn(),
  listOwned: jest.fn(),
  softDeleteOwned: jest.fn(),
  summarizeOwned: jest.fn(),
});

describe('WorkoutService', () => {
  it('derives ownership and canonical score on completion', async () => {
    const repository = createRepository();
    repository.completeIdempotently.mockImplementation(async (input) => ({
      created: true,
      session: sessionRecord(input),
    }));
    const service = new WorkoutService(repository, () => fixedNow);

    const result = await service.completeWorkout('user-1', validInput);

    expect(result.created).toBe(true);
    expect(repository.completeIdempotently).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalFormScore: 80,
        completedAt: fixedNow,
        status: 'completed',
        userId: 'user-1',
      }),
    );
    expect(repository.completeIdempotently.mock.calls[0]?.[0]).not.toHaveProperty('user_id');
  });

  it('rejects an invalid injected user identifier', async () => {
    const service = new WorkoutService(createRepository(), () => fixedNow);

    await expect(service.completeWorkout('../another-user', validInput)).rejects.toThrow();
  });

  it('rejects reuse of an idempotency key with a different completion payload', async () => {
    const repository = createRepository();
    repository.completeIdempotently.mockResolvedValue({
      created: false,
      session: sessionRecord({ totalReps: 11 }),
    });
    const service = new WorkoutService(repository, () => fixedNow);

    await expect(service.completeWorkout('user-1', validInput)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('uses not-found semantics for missing and cross-owner resources', async () => {
    const repository = createRepository();
    repository.findOwnedById.mockResolvedValue(null);
    repository.softDeleteOwned.mockResolvedValue(false);
    const service = new WorkoutService(repository, () => fixedNow);

    await expect(
      service.getOwnedSession('user-1', '507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.deleteOwnedSession('user-1', '507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('fills all four exercise summaries and calculates a current UTC streak', async () => {
    const repository = createRepository();
    const snapshot: WorkoutSummarySnapshot = {
      activeDates: ['2026-07-16', '2026-07-17', '2026-07-18'],
      averageFormScore: 80,
      bestScore: 90,
      exerciseStats: [
        {
          averageScore: 80,
          bestScore: 90,
          lastScore: 85,
          lastSessionAt: fixedNow,
          totalReps: 20,
          totalSessions: 2,
          workoutType: 'squat',
        },
      ],
      recentSessions: [sessionRecord()],
      totalReps: 20,
      totalSessions: 2,
    };
    repository.summarizeOwned.mockResolvedValue(snapshot);
    const service = new WorkoutService(repository, () => fixedNow);

    const summary = await service.getOwnedSummary('user-1');

    expect(summary.activeStreak).toBe(3);
    expect(summary.exerciseStats.map((item) => item.workoutType)).toEqual([
      'squat',
      'push_up',
      'crunch',
      'bicep_curl',
    ]);
    expect(summary.exerciseStats[1]).toMatchObject({ totalReps: 0, totalSessions: 0 });
  });

  it('forwards only the authenticated owner to paginated repository reads', async () => {
    const repository = createRepository();
    repository.listOwned.mockResolvedValue({ items: [], nextCursor: null });
    const service = new WorkoutService(repository, () => fixedNow);

    await service.listOwnedSessions('user-1', { limit: 10, workoutType: 'crunch' });

    expect(repository.listOwned).toHaveBeenCalledWith('user-1', {
      limit: 10,
      workoutType: 'crunch',
    });
  });
});

describe('workout summary calculations', () => {
  it('calculates canonical score and requires activity today for a streak', () => {
    expect(calculateCanonicalFormScore(8, 10)).toBe(80);
    expect(calculateCanonicalFormScore(0, 0)).toBe(0);
    expect(calculateActiveStreak(['2026-07-16', '2026-07-17'], fixedNow)).toBe(0);
  });
});
