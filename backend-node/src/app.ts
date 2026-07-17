import cookieParser from 'cookie-parser';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import type { Logger } from 'pino';

import type { Environment } from './config/env';
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
}

export const createApp = ({
  apiRouter = createApiRouter(),
  environment,
  healthRepository = new MongooseHealthRepository(),
  logger,
}: AppDependencies): Express => {
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

  app.use('/api/v1', apiRouter);

  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(environment, logger));

  return app;
};
