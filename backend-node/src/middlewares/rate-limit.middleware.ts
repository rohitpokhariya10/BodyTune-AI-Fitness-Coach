import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import type { Environment } from '../config/env';
import { RateLimitError } from '../errors/RateLimitError';

const isProbe = (path: string): boolean => path === '/health' || path === '/ready';

export const createGlobalRateLimit = (environment: Environment): RequestHandler =>
  rateLimit({
    handler: (_request, _response, next) => {
      next(new RateLimitError());
    },
    legacyHeaders: false,
    limit: environment.GLOBAL_RATE_LIMIT_MAX,
    skip: (request) => isProbe(request.path),
    standardHeaders: true,
    windowMs: environment.GLOBAL_RATE_LIMIT_WINDOW_MS,
  });

const createSensitiveRateLimit = (environment: Environment, limit: number): RequestHandler =>
  rateLimit({
    handler: (_request, _response, next) => {
      next(new RateLimitError('Too many authentication attempts. Please try again later.'));
    },
    legacyHeaders: false,
    limit,
    standardHeaders: true,
    windowMs: environment.AUTH_RATE_LIMIT_WINDOW_MS,
  });

export const createAuthenticationRateLimit = (environment: Environment): RequestHandler =>
  createSensitiveRateLimit(environment, environment.AUTH_RATE_LIMIT_MAX);

export const createOtpRateLimit = (environment: Environment): RequestHandler =>
  createSensitiveRateLimit(environment, environment.OTP_RATE_LIMIT_MAX);
