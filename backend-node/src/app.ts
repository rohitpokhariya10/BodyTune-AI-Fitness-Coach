import cookieParser from 'cookie-parser';
import express, { type Express, type RequestHandler, type Router } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import type { Logger } from 'pino';

import type { Environment } from './config/env';
import { createSessionMiddleware } from './config/session';
import { createCorsMiddleware } from './middlewares/cors.middleware';
import { createErrorMiddleware } from './middlewares/error.middleware';
import { createHttpLoggerMiddleware } from './middlewares/http-logger.middleware';
import { rejectUnsafeMongoInput } from './middlewares/mongo-sanitize.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { createGlobalRateLimit } from './middlewares/rate-limit.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import {
  MongooseHealthRepository,
  type HealthRepository,
} from './modules/health/health.repository';
import { createHealthRouter } from './modules/health/health.routes';
import { createApiRouter } from './routes';

export interface AppDependencies {
  apiRouter?: Router;
  environment: Environment;
  healthRepository?: HealthRepository;
  logger: Logger;
  sessionMiddleware?: false | RequestHandler;
}

export const createApp = (dependencies: AppDependencies): Express => {
  const { environment, healthRepository = new MongooseHealthRepository(), logger } = dependencies;
  const apiRouter = dependencies.apiRouter ?? createApiRouter(environment);
  const sessionMiddleware =
    dependencies.sessionMiddleware === false
      ? undefined
      : (dependencies.sessionMiddleware ?? createSessionMiddleware(environment));
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', environment.TRUST_PROXY);

  app.use(requestIdMiddleware);
  app.use(createHttpLoggerMiddleware(logger));
  app.use(helmet());
  app.use(createCorsMiddleware(environment));

  app.use(createHealthRouter(healthRepository));

  app.use(express.json({ limit: environment.REQUEST_BODY_LIMIT }));
  app.use(
    express.urlencoded({
      extended: false,
      limit: environment.REQUEST_BODY_LIMIT,
      parameterLimit: 100,
    }),
  );
  app.use(cookieParser());
  app.use(hpp());
  app.use(rejectUnsafeMongoInput);
  app.use(createGlobalRateLimit(environment));

  if (sessionMiddleware) {
    app.use(sessionMiddleware);
  }

  app.use('/api/v1', apiRouter);

  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(environment, logger));

  return app;
};
