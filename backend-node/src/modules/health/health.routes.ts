import { Router } from 'express';

import { HealthController } from './health.controller';
import { MongooseHealthRepository, type HealthRepository } from './health.repository';
import { HealthService } from './health.service';

export const createHealthRouter = (
  repository: HealthRepository = new MongooseHealthRepository(),
): Router => {
  const router = Router();
  const service = new HealthService(repository);
  const controller = new HealthController(service);

  router.get('/health', controller.liveness);
  router.get('/ready', controller.readiness);

  return router;
};
