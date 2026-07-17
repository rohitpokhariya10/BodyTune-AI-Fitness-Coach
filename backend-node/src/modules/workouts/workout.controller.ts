import type { Request, RequestHandler } from 'express';

import { AuthenticationError } from '../../errors/AuthenticationError';
import { sendSuccess } from '../../shared/http/response';
import { mapWorkoutSessionResponse, mapWorkoutSummaryResponse } from './workout.mapper';
import type { WorkoutService } from './workout.service';
import type {
  CompleteWorkoutRequest,
  WorkoutListRequest,
  WorkoutSessionParams,
} from './workout.validation';

export type AuthenticatedWorkoutUserIdResolver = (request: Request) => string | null | undefined;

export class WorkoutController {
  public constructor(
    private readonly service: WorkoutService,
    private readonly getAuthenticatedUserId: AuthenticatedWorkoutUserIdResolver,
  ) {}

  private resolveUserId(request: Request): string {
    const userId = this.getAuthenticatedUserId(request);

    if (!userId) {
      throw new AuthenticationError();
    }

    return userId;
  }

  public readonly complete: RequestHandler = async (request, response) => {
    const userId = this.resolveUserId(request);
    const input = request.validated.body as CompleteWorkoutRequest;
    const result = await this.service.completeWorkout(userId, input);

    sendSuccess(response, {
      data: {
        idempotent_replay: !result.created,
        session: mapWorkoutSessionResponse(result.session),
      },
      message: result.created ? 'Workout session completed' : 'Workout session already completed',
      statusCode: result.created ? 201 : 200,
    });
  };

  public readonly getOwned: RequestHandler = async (request, response) => {
    const userId = this.resolveUserId(request);
    const { sessionId } = request.validated.params as WorkoutSessionParams;
    const session = await this.service.getOwnedSession(userId, sessionId);

    sendSuccess(response, {
      data: mapWorkoutSessionResponse(session),
      message: 'Workout session retrieved',
    });
  };

  public readonly listOwned: RequestHandler = async (request, response) => {
    const userId = this.resolveUserId(request);
    const query = request.validated.query as WorkoutListRequest;
    const page = await this.service.listOwnedSessions(userId, query);

    sendSuccess(response, {
      data: page.items.map(mapWorkoutSessionResponse),
      message: 'Workout sessions retrieved',
      meta: {
        limit: query.limit,
        nextCursor: page.nextCursor,
      },
    });
  };

  public readonly deleteOwned: RequestHandler = async (request, response) => {
    const userId = this.resolveUserId(request);
    const { sessionId } = request.validated.params as WorkoutSessionParams;
    await this.service.deleteOwnedSession(userId, sessionId);

    sendSuccess(response, {
      data: { deleted: true },
      message: 'Workout session deleted',
    });
  };

  public readonly summary: RequestHandler = async (request, response) => {
    const userId = this.resolveUserId(request);
    const summary = await this.service.getOwnedSummary(userId);

    sendSuccess(response, {
      data: mapWorkoutSummaryResponse(summary),
      message: 'Workout summary retrieved',
    });
  };
}
