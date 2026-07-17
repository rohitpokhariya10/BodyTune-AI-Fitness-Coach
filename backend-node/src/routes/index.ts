import { Router } from 'express';

import { createEmailGateway } from '../config/email';
import type { Environment } from '../config/env';
import { createGooglePassport } from '../config/passport';
import { createSessionManager, readSessionPrincipal } from '../config/session';
import { createCsrfMiddleware, issueCsrfToken } from '../middlewares/csrf.middleware';
import {
  createAuthenticationRateLimit,
  createOtpRateLimit,
} from '../middlewares/rate-limit.middleware';
import { AuthController } from '../modules/auth/auth.controller';
import {
  createAuthenticationMiddleware,
  getAuthenticatedUser,
} from '../modules/auth/auth.middleware';
import { createAuthRouter } from '../modules/auth/auth.routes';
import { HmacOtpHasher, ScryptPasswordHasher } from '../modules/auth/auth.security';
import { AuthService } from '../modules/auth/auth.service';
import { MongooseOtpChallengeRepository } from '../modules/auth/otp-challenge.repository';
import { ProfileController } from '../modules/profiles/profile.controller';
import { UserBackedProfileRepository } from '../modules/profiles/profile.repository';
import { createProfileRouter } from '../modules/profiles/profile.routes';
import { ProfileService } from '../modules/profiles/profile.service';
import { MongooseUserRepository } from '../modules/users/user.repository';
import { createWorkoutRouter } from '../modules/workouts';

export const createApiRouter = (environment: Environment): Router => {
  const router = Router();
  const userRepository = new MongooseUserRepository();
  const authService = new AuthService({
    emailGateway: createEmailGateway(environment),
    options: {
      otpExpiresMinutes: environment.OTP_TTL_SECONDS / 60,
      otpMaxAttempts: environment.OTP_MAX_ATTEMPTS,
      otpResendCooldownSeconds: environment.OTP_RESEND_COOLDOWN_SECONDS,
    },
    otpHasher: new HmacOtpHasher(environment.OTP_PEPPER),
    otpRepository: new MongooseOtpChallengeRepository(),
    passwordHasher: new ScryptPasswordHasher(),
    userRepository,
  });
  const sessionManager = createSessionManager(environment);
  const authenticate = createAuthenticationMiddleware(authService, readSessionPrincipal);
  const csrfProtection = createCsrfMiddleware(environment);
  const googleOAuth = createGooglePassport(environment, authService);
  const authController = new AuthController(authService, sessionManager, {
    allowedOAuthReturnPaths: environment.OAUTH_ALLOWED_RETURN_PATHS,
    frontendUrl: environment.FRONTEND_URL,
    issueCsrfToken,
  });

  router.use(
    '/auth',
    createAuthRouter({
      authenticate,
      controller: authController,
      csrfProtection,
      ...(googleOAuth === null ? {} : { googleOAuth }),
      localAuthEnabled: environment.AUTH_LOCAL_ENABLED,
      rateLimits: {
        login: createAuthenticationRateLimit(environment),
        otp: createOtpRateLimit(environment),
        passwordRecovery: createOtpRateLimit(environment),
        registration: createAuthenticationRateLimit(environment),
      },
    }),
  );

  const profileRepository = new UserBackedProfileRepository(userRepository);
  const profileController = new ProfileController(new ProfileService(profileRepository));
  router.use(
    '/profiles',
    createProfileRouter({
      authenticate,
      controller: profileController,
      csrfProtection,
      mutationRateLimit: createAuthenticationRateLimit(environment),
    }),
  );

  router.use(
    createWorkoutRouter({
      authenticate,
      csrfProtection,
      getAuthenticatedUserId: (request) => getAuthenticatedUser(request).id,
    }),
  );

  return router;
};
