import { Router, type RequestHandler } from 'express';

import { validateRequest } from '../../middlewares/validation.middleware';
import type { AuthController } from './auth.controller';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resendOtpBodySchema,
  resetPasswordBodySchema,
  verifyOtpBodySchema,
} from './auth.validation';

export interface AuthRouteRateLimits {
  login: RequestHandler;
  otp: RequestHandler;
  passwordRecovery: RequestHandler;
  registration: RequestHandler;
}

export interface AuthRouterDependencies {
  authenticate: RequestHandler;
  controller: AuthController;
  csrfProtection: RequestHandler;
  googleOAuth?: GoogleOAuthRouteHandlers;
  localAuthEnabled: boolean;
  rateLimits: AuthRouteRateLimits;
}

export interface GoogleOAuthRouteHandlers {
  callback: RequestHandler;
  initialize: RequestHandler;
  start: RequestHandler;
}

export const createAuthRouter = ({
  authenticate,
  controller,
  csrfProtection,
  googleOAuth,
  localAuthEnabled,
  rateLimits,
}: AuthRouterDependencies): Router => {
  const router = Router();

  if (localAuthEnabled) {
    router.post(
      '/register',
      rateLimits.registration,
      csrfProtection,
      validateRequest({ body: registerBodySchema }),
      controller.register,
    );
    router.post(
      '/login',
      rateLimits.login,
      csrfProtection,
      validateRequest({ body: loginBodySchema }),
      controller.login,
    );
    router.post(
      '/verify-otp',
      rateLimits.otp,
      csrfProtection,
      validateRequest({ body: verifyOtpBodySchema }),
      controller.verifyOtp,
    );
    router.post(
      '/resend-otp',
      rateLimits.otp,
      csrfProtection,
      validateRequest({ body: resendOtpBodySchema }),
      controller.resendOtp,
    );
    router.post(
      '/forgot-password',
      rateLimits.passwordRecovery,
      csrfProtection,
      validateRequest({ body: forgotPasswordBodySchema }),
      controller.forgotPassword,
    );
    router.post(
      '/reset-password',
      rateLimits.passwordRecovery,
      csrfProtection,
      validateRequest({ body: resetPasswordBodySchema }),
      controller.resetPassword,
    );
  }
  router.get('/csrf-token', controller.csrfToken);
  router.get('/me', authenticate, controller.me);
  router.post('/logout', authenticate, csrfProtection, controller.logout);

  if (googleOAuth) {
    router.use(googleOAuth.initialize);
    router.get('/google', rateLimits.login, googleOAuth.start);
    router.get(
      '/google/callback',
      rateLimits.login,
      googleOAuth.callback,
      controller.completeGoogleOAuth,
    );
  }

  return router;
};
