import cors from 'cors';
import type { RequestHandler } from 'express';

import type { Environment } from '../config/env';
import { AuthorizationError } from '../errors/AuthorizationError';

export const createCorsMiddleware = (environment: Environment): RequestHandler =>
  cors({
    credentials: true,
    maxAge: 600,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: (origin, callback) => {
      if (!origin || environment.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new AuthorizationError('The request origin is not allowed'));
    },
  });
