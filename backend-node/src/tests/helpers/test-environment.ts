import { Router, type Express, type RequestHandler } from 'express';

import { createApp } from '../../app';
import { parseEnvironment, type Environment } from '../../config/env';
import { createLogger } from '../../config/logger';
import type { DatabaseState } from '../../config/database';
import type { HealthRepository } from '../../modules/health/health.repository';

export class FakeHealthRepository implements HealthRepository {
  public constructor(
    public ready = false,
    public state: DatabaseState = 'disconnected',
  ) {}

  public getDatabaseStatus(): Promise<{
    ready: boolean;
    state: DatabaseState;
  }> {
    return Promise.resolve({
      ready: this.ready,
      state: this.state,
    });
  }
}

export const createTestEnvironment = (
  overrides: Record<string, string | undefined> = {},
): Environment =>
  parseEnvironment({
    CORS_ORIGINS: 'http://localhost:5173',
    LOG_LEVEL: 'silent',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/bodytune_test',
    NODE_ENV: 'test',
    ...overrides,
  });

export const createTestApp = (options?: {
  apiRouter?: Router;
  environment?: Environment;
  healthRepository?: HealthRepository;
  sessionMiddleware?: false | RequestHandler;
}): Express => {
  const environment = options?.environment ?? createTestEnvironment();

  return createApp({
    apiRouter: options?.apiRouter ?? Router(),
    environment,
    healthRepository: options?.healthRepository ?? new FakeHealthRepository(),
    logger: createLogger(environment),
    sessionMiddleware: options?.sessionMiddleware ?? false,
  });
};
