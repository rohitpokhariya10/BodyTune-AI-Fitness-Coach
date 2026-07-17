import { type FilterQuery, Types } from 'mongoose';

import {
  WorkoutSessionModel,
  type WorkoutSessionDocument,
  type WorkoutSessionPersistence,
} from './workout-session.model';
import type {
  CompleteWorkoutResult,
  NewCompletedWorkoutSession,
  WorkoutExerciseSummary,
  WorkoutListQuery,
  WorkoutSessionPage,
  WorkoutSessionRecord,
  WorkoutSummarySnapshot,
  WorkoutType,
} from './workout.types';

export interface WorkoutRepository {
  completeIdempotently(input: NewCompletedWorkoutSession): Promise<CompleteWorkoutResult>;
  findOwnedById(userId: string, sessionId: string): Promise<WorkoutSessionRecord | null>;
  listOwned(userId: string, query: WorkoutListQuery): Promise<WorkoutSessionPage>;
  softDeleteOwned(userId: string, sessionId: string): Promise<boolean>;
  summarizeOwned(userId: string): Promise<WorkoutSummarySnapshot>;
}

interface DuplicateKeyError {
  code: number;
}

interface TotalsAggregateRow {
  averageFormScore: number;
  bestScore: number;
  totalReps: number;
  totalSessions: number;
}

interface ExerciseAggregateRow {
  _id: WorkoutType;
  averageScore: number;
  bestScore: number;
  lastScore: number;
  lastSessionAt: Date;
  totalReps: number;
  totalSessions: number;
}

interface ActiveDateAggregateRow {
  _id: string;
}

const isDuplicateKeyError = (error: unknown): error is DuplicateKeyError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 11_000;

const toRecord = (document: WorkoutSessionDocument): WorkoutSessionRecord => ({
  canonicalFormScore: document.canonicalFormScore,
  ...(document.clientFormScore === undefined ? {} : { clientFormScore: document.clientFormScore }),
  clientSessionId: document.clientSessionId,
  completedAt: document.completedAt,
  correctReps: document.correctReps,
  createdAt: document.createdAt,
  deletedAt: document.deletedAt,
  durationSeconds: document.durationSeconds,
  feedbackTags: [...document.feedbackTags],
  id: document._id.toString(),
  incorrectReps: document.incorrectReps,
  poseEngine: {
    modelName: document.poseEngine.modelName,
    modelVersion: document.poseEngine.modelVersion,
    name: document.poseEngine.name,
    packageVersion: document.poseEngine.packageVersion,
    workoutRulesVersion: document.poseEngine.workoutRulesVersion,
  },
  primaryFeedback: document.primaryFeedback,
  recommendation: {
    message: document.recommendation.message,
    rulesVersion: document.recommendation.rulesVersion,
    type: document.recommendation.type,
  },
  status: document.status,
  totalReps: document.totalReps,
  updatedAt: document.updatedAt,
  userId: document.userId,
  workoutType: document.workoutType,
});

const buildPersistenceInsert = (input: NewCompletedWorkoutSession): WorkoutSessionPersistence => ({
  canonicalFormScore: input.canonicalFormScore,
  ...(input.clientFormScore === undefined ? {} : { clientFormScore: input.clientFormScore }),
  clientSessionId: input.clientSessionId.toLowerCase(),
  completedAt: input.completedAt,
  correctReps: input.correctReps,
  createdAt: input.completedAt,
  deletedAt: null,
  durationSeconds: input.durationSeconds,
  feedbackTags: [...input.feedbackTags],
  incorrectReps: input.incorrectReps,
  poseEngine: { ...input.poseEngine },
  primaryFeedback: input.primaryFeedback,
  recommendation: { ...input.recommendation },
  status: input.status,
  totalReps: input.totalReps,
  updatedAt: input.completedAt,
  userId: input.userId,
  workoutType: input.workoutType,
});

export class MongooseWorkoutRepository implements WorkoutRepository {
  public async completeIdempotently(
    input: NewCompletedWorkoutSession,
  ): Promise<CompleteWorkoutResult> {
    const clientSessionId = input.clientSessionId.toLowerCase();

    try {
      const result = await WorkoutSessionModel.findOneAndUpdate(
        { clientSessionId, userId: input.userId },
        { $setOnInsert: buildPersistenceInsert(input) },
        {
          includeResultMetadata: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          timestamps: false,
          upsert: true,
        },
      ).exec();

      if (result.value === null) {
        throw new Error('Workout completion did not return a session');
      }

      return {
        created: result.lastErrorObject?.updatedExisting === false,
        session: toRecord(result.value),
      };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const existing = await WorkoutSessionModel.findOne({
        clientSessionId,
        userId: input.userId,
      }).exec();
      if (existing === null) {
        throw error;
      }

      return {
        created: false,
        session: toRecord(existing),
      };
    }
  }

  public async findOwnedById(
    userId: string,
    sessionId: string,
  ): Promise<WorkoutSessionRecord | null> {
    if (!Types.ObjectId.isValid(sessionId)) {
      return null;
    }

    const document = await WorkoutSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      deletedAt: null,
      userId,
    }).exec();

    return document === null ? null : toRecord(document);
  }

  public async listOwned(userId: string, query: WorkoutListQuery): Promise<WorkoutSessionPage> {
    const filter: FilterQuery<WorkoutSessionPersistence> = {
      deletedAt: null,
      userId,
    };

    if (query.cursor !== undefined) {
      filter._id = { $lt: new Types.ObjectId(query.cursor) };
    }

    if (query.workoutType !== undefined) {
      filter.workoutType = query.workoutType;
    }

    const documents = await WorkoutSessionModel.find(filter)
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .exec();
    const hasMore = documents.length > query.limit;
    const visibleDocuments = documents.slice(0, query.limit);
    const items = visibleDocuments.map(toRecord);

    return {
      items,
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }

  public async softDeleteOwned(userId: string, sessionId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(sessionId)) {
      return false;
    }

    const result = await WorkoutSessionModel.updateOne(
      {
        _id: new Types.ObjectId(sessionId),
        deletedAt: null,
        userId,
      },
      { $set: { deletedAt: new Date() } },
      { runValidators: true },
    ).exec();

    return result.modifiedCount === 1;
  }

  public async summarizeOwned(userId: string): Promise<WorkoutSummarySnapshot> {
    const baseMatch = { deletedAt: null, userId };
    const [totalsRows, exerciseRows, activeDateRows, recentPage] = await Promise.all([
      WorkoutSessionModel.aggregate<TotalsAggregateRow>([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            averageFormScore: { $avg: '$canonicalFormScore' },
            bestScore: { $max: '$canonicalFormScore' },
            totalReps: { $sum: '$totalReps' },
            totalSessions: { $sum: 1 },
          },
        },
      ]).exec(),
      WorkoutSessionModel.aggregate<ExerciseAggregateRow>([
        { $match: baseMatch },
        { $sort: { completedAt: -1, _id: -1 } },
        {
          $group: {
            _id: '$workoutType',
            averageScore: { $avg: '$canonicalFormScore' },
            bestScore: { $max: '$canonicalFormScore' },
            lastScore: { $first: '$canonicalFormScore' },
            lastSessionAt: { $first: '$completedAt' },
            totalReps: { $sum: '$totalReps' },
            totalSessions: { $sum: 1 },
          },
        },
      ]).exec(),
      WorkoutSessionModel.aggregate<ActiveDateAggregateRow>([
        { $match: baseMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                date: '$completedAt',
                format: '%Y-%m-%d',
                timezone: 'UTC',
              },
            },
          },
        },
      ]).exec(),
      this.listOwned(userId, { limit: 5 }),
    ]);
    const totals = totalsRows[0];
    const exerciseStats: WorkoutExerciseSummary[] = exerciseRows.map((row) => ({
      averageScore: Math.round(row.averageScore),
      bestScore: row.bestScore,
      lastScore: row.lastScore,
      lastSessionAt: row.lastSessionAt,
      totalReps: row.totalReps,
      totalSessions: row.totalSessions,
      workoutType: row._id,
    }));

    return {
      activeDates: activeDateRows.map((row) => row._id),
      averageFormScore: totals ? Math.round(totals.averageFormScore) : 0,
      bestScore: totals?.bestScore ?? 0,
      exerciseStats,
      recentSessions: recentPage.items,
      totalReps: totals?.totalReps ?? 0,
      totalSessions: totals?.totalSessions ?? 0,
    };
  }
}
