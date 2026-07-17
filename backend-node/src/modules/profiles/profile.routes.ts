import { Router, type RequestHandler } from 'express';

import { validateRequest } from '../../middlewares/validation.middleware';
import type { ProfileController } from './profile.controller';
import { profileUpdateBodySchema } from './profile.validation';

export interface ProfileRouterDependencies {
  authenticate: RequestHandler;
  controller: ProfileController;
  csrfProtection: RequestHandler;
  mutationRateLimit: RequestHandler;
}

export const createProfileRouter = ({
  authenticate,
  controller,
  csrfProtection,
  mutationRateLimit,
}: ProfileRouterDependencies): Router => {
  const router = Router();

  router.get('/me', authenticate, controller.getMe);
  router.put(
    '/me',
    authenticate,
    mutationRateLimit,
    csrfProtection,
    validateRequest({ body: profileUpdateBodySchema }),
    controller.updateMe,
  );
  router.patch(
    '/me',
    authenticate,
    mutationRateLimit,
    csrfProtection,
    validateRequest({ body: profileUpdateBodySchema }),
    controller.updateMe,
  );

  return router;
};
