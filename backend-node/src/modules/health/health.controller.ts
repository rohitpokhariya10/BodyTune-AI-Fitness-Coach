import type { RequestHandler } from 'express';

import { sendSuccess } from '../../shared/http/response';
import type { HealthService } from './health.service';

export class HealthController {
  public constructor(private readonly service: HealthService) {}

  public readonly liveness: RequestHandler = (_request, response) => {
    sendSuccess(response, {
      data: this.service.getLiveness(),
      message: 'Service is alive',
    });
  };

  public readonly readiness: RequestHandler = async (_request, response) => {
    sendSuccess(response, {
      data: await this.service.getReadiness(),
      message: 'Service is ready',
    });
  };
}
