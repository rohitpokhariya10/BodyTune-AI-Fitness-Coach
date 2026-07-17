import { Router, type RequestHandler } from 'express';

import { validateRequest } from '../../middlewares/validation.middleware';
import { WorkoutController, type AuthenticatedWorkoutUserIdResolver } from './workout.controller';
import { MongooseWorkoutRepository, type WorkoutRepository } from './workout.repository';
import { WorkoutService } from './workout.service';
import {
  completeWorkoutBodySchema,
  workoutListQuerySchema,
  workoutSessionParamsSchema,
} from './workout.validation';

export interface WorkoutRouterDependencies {
  authenticate: RequestHandler;
  csrfProtection: RequestHandler;
  getAuthenticatedUserId: AuthenticatedWorkoutUserIdResolver;
  repository?: WorkoutRepository;
}

export const createWorkoutRouter = ({
  authenticate,
  csrfProtection,
  getAuthenticatedUserId,
  repository = new MongooseWorkoutRepository(),
}: WorkoutRouterDependencies): Router => {
  const router = Router();
  const service = new WorkoutService(repository);
  const controller = new WorkoutController(service, getAuthenticatedUserId);

  router.use(authenticate);
  router.post(
    '/workout-sessions/complete',
    csrfProtection,
    validateRequest({ body: completeWorkoutBodySchema }),
    controller.complete,
  );
  router.get(
    '/workout-sessions/me',
    validateRequest({ query: workoutListQuerySchema }),
    controller.listOwned,
  );
  router.get('/workouts/summary', controller.summary);
  router.get(
    '/workout-sessions/:sessionId',
    validateRequest({ params: workoutSessionParamsSchema }),
    controller.getOwned,
  );
  router.delete(
    '/workout-sessions/:sessionId',
    csrfProtection,
    validateRequest({ params: workoutSessionParamsSchema }),
    controller.deleteOwned,
  );

  return router;
};
