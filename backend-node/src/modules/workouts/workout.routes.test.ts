import type { RequestHandler } from 'express';
import request from 'supertest';

import { AuthenticationError } from '../../errors/AuthenticationError';
import { createTestApp } from '../../tests/helpers/test-environment';
import type { WorkoutRepository } from './workout.repository';
import { createWorkoutRouter } from './workout.routes';
import type {
  CompleteWorkoutResult,
  NewCompletedWorkoutSession,
  WorkoutListQuery,
  WorkoutSessionPage,
  WorkoutSessionRecord,
  WorkoutSummarySnapshot,
} from './workout.types';

const validPayload = {
  client_form_score: 88,
  client_session_id: '550e8400-e29b-41d4-a716-446655440000',
  correct_reps: 8,
  duration_seconds: 90,
  feedback_tags: ['back_alignment'],
  incorrect_reps: 2,
  pose_engine: {
    model_name: 'pose_landmarker_lite_float16',
    model_version: '2026.07.1',
    name: 'mediapipe_pose_landmarker',
    package_version: '0.10.34',
    workout_rules_version: '1',
  },
  primary_feedback: 'Keep your torso steady',
  total_reps: 10,
  workout_type: 'squat',
} as const;

class InMemoryWorkoutRepository implements WorkoutRepository {
  private readonly records: WorkoutSessionRecord[] = [];

  public async completeIdempotently(
    input: NewCompletedWorkoutSession,
  ): Promise<CompleteWorkoutResult> {
    const existing = this.records.find(
      (record) =>
        record.userId === input.userId &&
        record.clientSessionId.toLowerCase() === input.clientSessionId.toLowerCase(),
    );
    if (existing) {
      return { created: false, session: existing };
    }

    const id = (this.records.length + 1).toString(16).padStart(24, '0');
    const session: WorkoutSessionRecord = {
      ...input,
      clientSessionId: input.clientSessionId.toLowerCase(),
      createdAt: input.completedAt,
      deletedAt: null,
      id,
      updatedAt: input.completedAt,
    };
    this.records.push(session);
    return { created: true, session };
  }

  public async findOwnedById(
    userId: string,
    sessionId: string,
  ): Promise<WorkoutSessionRecord | null> {
    return (
      this.records.find(
        (record) => record.id === sessionId && record.userId === userId && !record.deletedAt,
      ) ?? null
    );
  }

  public async listOwned(userId: string, query: WorkoutListQuery): Promise<WorkoutSessionPage> {
    const items = this.records
      .filter(
        (record) =>
          record.userId === userId &&
          !record.deletedAt &&
          (query.workoutType === undefined || record.workoutType === query.workoutType),
      )
      .slice(0, query.limit);
    return { items, nextCursor: null };
  }

  public async softDeleteOwned(userId: string, sessionId: string): Promise<boolean> {
    const record = await this.findOwnedById(userId, sessionId);
    if (!record) {
      return false;
    }

    record.deletedAt = new Date();
    return true;
  }

  public async summarizeOwned(userId: string): Promise<WorkoutSummarySnapshot> {
    const sessions = this.records.filter((record) => record.userId === userId && !record.deletedAt);
    const totalScore = sessions.reduce((total, session) => total + session.canonicalFormScore, 0);

    return {
      activeDates: sessions.map((session) => session.completedAt.toISOString().slice(0, 10)),
      averageFormScore: sessions.length === 0 ? 0 : Math.round(totalScore / sessions.length),
      bestScore: Math.max(0, ...sessions.map((session) => session.canonicalFormScore)),
      exerciseStats: [],
      recentSessions: sessions.slice(0, 5),
      totalReps: sessions.reduce((total, session) => total + session.totalReps, 0),
      totalSessions: sessions.length,
    };
  }
}

const authenticate: RequestHandler = (request, _response, next) => {
  if (!request.header('x-test-user-id')) {
    next(new AuthenticationError());
    return;
  }

  next();
};

const createApplication = (): {
  application: ReturnType<typeof createTestApp>;
  repository: InMemoryWorkoutRepository;
} => {
  const repository = new InMemoryWorkoutRepository();
  const router = createWorkoutRouter({
    authenticate,
    csrfProtection: (_request, _response, next) => {
      next();
    },
    getAuthenticatedUserId: (request) => request.header('x-test-user-id'),
    repository,
  });

  return { application: createTestApp({ apiRouter: router }), repository };
};

describe('workout routes', () => {
  it('requires the injected authentication middleware', async () => {
    const { application } = createApplication();

    const response = await request(application)
      .post('/api/v1/workout-sessions/complete')
      .send(validPayload)
      .expect(401);

    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects ownership supplied in the request body', async () => {
    const { application } = createApplication();

    const response = await request(application)
      .post('/api/v1/workout-sessions/complete')
      .set('x-test-user-id', 'user-1')
      .send({ ...validPayload, user_id: 'user-2' })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.errors).toEqual([expect.objectContaining({ code: 'unrecognized_keys' })]);
  });

  it('atomically completes once and returns an idempotent replay', async () => {
    const { application } = createApplication();

    const created = await request(application)
      .post('/api/v1/workout-sessions/complete')
      .set('x-test-user-id', 'user-1')
      .send(validPayload)
      .expect(201);
    const replay = await request(application)
      .post('/api/v1/workout-sessions/complete')
      .set('x-test-user-id', 'user-1')
      .send(validPayload)
      .expect(200);

    expect(created.body.data.idempotent_replay).toBe(false);
    expect(replay.body.data.idempotent_replay).toBe(true);
    expect(replay.body.data.session.id).toBe(created.body.data.session.id);
    expect(created.body.data.session).not.toHaveProperty('user_id');
    expect(created.body.data.session.recommendation).toMatchObject({
      rules_version: '1',
      type: 'form',
    });
  });

  it('scopes reads and deletes to the authenticated owner', async () => {
    const { application } = createApplication();
    const created = await request(application)
      .post('/api/v1/workout-sessions/complete')
      .set('x-test-user-id', 'user-1')
      .send(validPayload)
      .expect(201);
    const sessionId = String(created.body.data.session.id);

    await request(application)
      .get(`/api/v1/workout-sessions/${sessionId}`)
      .set('x-test-user-id', 'user-2')
      .expect(404);
    await request(application)
      .delete(`/api/v1/workout-sessions/${sessionId}`)
      .set('x-test-user-id', 'user-2')
      .expect(404);
    await request(application)
      .get(`/api/v1/workout-sessions/${sessionId}`)
      .set('x-test-user-id', 'user-1')
      .expect(200);
    await request(application)
      .delete(`/api/v1/workout-sessions/${sessionId}`)
      .set('x-test-user-id', 'user-1')
      .expect(200);
    await request(application)
      .get(`/api/v1/workout-sessions/${sessionId}`)
      .set('x-test-user-id', 'user-1')
      .expect(404);
  });

  it('returns owner-only pagination and a four-exercise summary', async () => {
    const { application } = createApplication();
    await request(application)
      .post('/api/v1/workout-sessions/complete')
      .set('x-test-user-id', 'user-1')
      .send(validPayload)
      .expect(201);
    await request(application)
      .post('/api/v1/workout-sessions/complete')
      .set('x-test-user-id', 'user-2')
      .send(validPayload)
      .expect(201);

    const history = await request(application)
      .get('/api/v1/workout-sessions/me?limit=10&workout_type=squat')
      .set('x-test-user-id', 'user-1')
      .expect(200);
    const summary = await request(application)
      .get('/api/v1/workouts/summary')
      .set('x-test-user-id', 'user-1')
      .expect(200);

    expect(history.body.data).toHaveLength(1);
    expect(history.body.meta).toMatchObject({ limit: 10, nextCursor: null });
    expect(summary.body.data.total_sessions).toBe(1);
    expect(summary.body.data.exercise_stats).toHaveLength(4);
  });
});
