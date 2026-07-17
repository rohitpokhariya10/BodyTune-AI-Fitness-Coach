import { DatabaseError } from '../../errors/DatabaseError';
import type { HealthRepository } from './health.repository';
import type { LivenessStatus, ReadinessStatus } from './health.types';

export class HealthService {
  public constructor(private readonly repository: HealthRepository) {}

  public getLiveness(): LivenessStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
    };
  }

  public async getReadiness(): Promise<ReadinessStatus> {
    const database = await this.repository.getDatabaseStatus();

    if (!database.ready) {
      throw new DatabaseError('Service is not ready');
    }

    return {
      checks: {
        database: 'up',
      },
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
