import { WorkoutSessionModel, type WorkoutSessionDocument } from './workout-session.model';
import { MongooseWorkoutRepository } from './workout.repository';
import type { NewCompletedWorkoutSession } from './workout.types';

const completedAt = new Date('2026-07-18T10:00:00.000Z');

const completedInput: NewCompletedWorkoutSession = {
  canonicalFormScore: 80,
  clientFormScore: 82,
  clientSessionId: '550e8400-e29b-41d4-a716-446655440000',
  completedAt,
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
  recommendation: {
    message: 'Use slower reps.',
    rulesVersion: '1',
    type: 'form',
  },
  status: 'completed',
  totalReps: 10,
  userId: 'user-1',
  workoutType: 'squat',
};

const createDocument = (id = '507f1f77bcf86cd799439011'): WorkoutSessionDocument =>
  new WorkoutSessionModel({
    ...completedInput,
    _id: id,
    createdAt: completedAt,
    deletedAt: null,
    updatedAt: completedAt,
  });

const mockFindDocuments = (
  documents: WorkoutSessionDocument[],
): { exec: jest.Mock; limit: jest.Mock; sort: jest.Mock } => {
  const exec = jest.fn().mockResolvedValue(documents);
  const limit = jest.fn().mockReturnValue({ exec });
  const sort = jest.fn().mockReturnValue({ limit });
  jest.spyOn(WorkoutSessionModel, 'find').mockReturnValue({ sort } as never);
  return { exec, limit, sort };
};

describe('WorkoutSession model', () => {
  it('enforces rep totals and per-exercise feedback tags below the HTTP layer', async () => {
    await expect(createDocument().validate()).resolves.toBeUndefined();

    const invalidTotals = createDocument();
    invalidTotals.correctReps = 7;
    await expect(invalidTotals.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({ totalReps: expect.anything() }),
    });

    const invalidTag = createDocument();
    invalidTag.feedbackTags = ['body_alignment'];
    await expect(invalidTag.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({ feedbackTags: expect.anything() }),
    });
  });
});

describe('MongooseWorkoutRepository', () => {
  it('uses one atomic upsert and reports create versus replay', async () => {
    const repository = new MongooseWorkoutRepository();
    const document = createDocument();
    const exec = jest
      .fn()
      .mockResolvedValueOnce({
        lastErrorObject: { updatedExisting: false },
        value: document,
      })
      .mockResolvedValueOnce({
        lastErrorObject: { updatedExisting: true },
        value: document,
      });
    const findOneAndUpdate = jest
      .spyOn(WorkoutSessionModel, 'findOneAndUpdate')
      .mockReturnValue({ exec } as never);

    await expect(repository.completeIdempotently(completedInput)).resolves.toMatchObject({
      created: true,
      session: { id: document.id, userId: 'user-1' },
    });
    await expect(repository.completeIdempotently(completedInput)).resolves.toMatchObject({
      created: false,
      session: { id: document.id },
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        clientSessionId: completedInput.clientSessionId,
        userId: 'user-1',
      },
      expect.objectContaining({ $setOnInsert: expect.any(Object) }),
      expect.objectContaining({
        includeResultMetadata: true,
        timestamps: false,
        upsert: true,
      }),
    );
  });

  it('recovers a duplicate-key race by reading the winning idempotent document', async () => {
    const repository = new MongooseWorkoutRepository();
    const document = createDocument();
    jest.spyOn(WorkoutSessionModel, 'findOneAndUpdate').mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11_000 }),
    } as never);
    const findExec = jest.fn().mockResolvedValue(document);
    jest.spyOn(WorkoutSessionModel, 'findOne').mockReturnValue({ exec: findExec } as never);

    await expect(repository.completeIdempotently(completedInput)).resolves.toMatchObject({
      created: false,
      session: { id: document.id },
    });
  });

  it('returns owner-scoped records and rejects malformed identifiers without a query', async () => {
    const repository = new MongooseWorkoutRepository();
    const findOne = jest.spyOn(WorkoutSessionModel, 'findOne');

    await expect(repository.findOwnedById('user-1', 'invalid')).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();

    const document = createDocument();
    findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(document) } as never);
    await expect(repository.findOwnedById('user-1', document.id)).resolves.toMatchObject({
      id: document.id,
      userId: 'user-1',
    });
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAt: null, userId: 'user-1' }),
    );
  });

  it('applies bounded cursor pagination and owner/exercise filters', async () => {
    const repository = new MongooseWorkoutRepository();
    const first = createDocument('507f1f77bcf86cd799439012');
    const second = createDocument('507f1f77bcf86cd799439011');
    const query = mockFindDocuments([first, second]);

    const page = await repository.listOwned('user-1', {
      cursor: '507f1f77bcf86cd799439013',
      limit: 1,
      workoutType: 'squat',
    });

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe(first.id);
    expect(query.sort).toHaveBeenCalledWith({ _id: -1 });
    expect(query.limit).toHaveBeenCalledWith(2);
    expect(WorkoutSessionModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedAt: null,
        userId: 'user-1',
        workoutType: 'squat',
      }),
    );
  });

  it('soft-deletes only valid, owned, active sessions', async () => {
    const repository = new MongooseWorkoutRepository();
    const updateOne = jest.spyOn(WorkoutSessionModel, 'updateOne');

    await expect(repository.softDeleteOwned('user-1', 'invalid')).resolves.toBe(false);
    expect(updateOne).not.toHaveBeenCalled();

    updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    } as never);
    await expect(repository.softDeleteOwned('user-1', '507f1f77bcf86cd799439011')).resolves.toBe(
      true,
    );
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ deletedAt: null, userId: 'user-1' }),
      expect.objectContaining({ $set: { deletedAt: expect.any(Date) } }),
      { runValidators: true },
    );
  });

  it('builds aggregate totals, exercise metrics, UTC dates, and recent history', async () => {
    const repository = new MongooseWorkoutRepository();
    const document = createDocument();
    jest
      .spyOn(WorkoutSessionModel, 'aggregate')
      .mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue([
            { averageFormScore: 80.4, bestScore: 90, totalReps: 20, totalSessions: 2 },
          ]),
      } as never)
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          {
            _id: 'squat',
            averageScore: 80.4,
            bestScore: 90,
            lastScore: 80,
            lastSessionAt: completedAt,
            totalReps: 20,
            totalSessions: 2,
          },
        ]),
      } as never)
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ _id: '2026-07-18' }]),
      } as never);
    mockFindDocuments([document]);

    await expect(repository.summarizeOwned('user-1')).resolves.toMatchObject({
      activeDates: ['2026-07-18'],
      averageFormScore: 80,
      bestScore: 90,
      exerciseStats: [
        {
          averageScore: 80,
          totalReps: 20,
          totalSessions: 2,
          workoutType: 'squat',
        },
      ],
      recentSessions: [{ id: document.id }],
      totalReps: 20,
      totalSessions: 2,
    });
  });
});
