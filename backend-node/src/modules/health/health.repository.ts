import {
  getDatabaseState,
  isDatabaseReady,
  pingDatabase,
  type DatabaseState,
} from '../../config/database';

export interface HealthRepository {
  getDatabaseStatus(): Promise<{
    ready: boolean;
    state: DatabaseState;
  }>;
}

export class MongooseHealthRepository implements HealthRepository {
  private cachedStatus:
    | {
        expiresAt: number;
        ready: boolean;
        state: DatabaseState;
      }
    | undefined;

  public async getDatabaseStatus(): Promise<{
    ready: boolean;
    state: DatabaseState;
  }> {
    const now = Date.now();

    if (this.cachedStatus && this.cachedStatus.expiresAt > now) {
      return {
        ready: this.cachedStatus.ready,
        state: this.cachedStatus.state,
      };
    }

    const state = getDatabaseState();
    const ready = isDatabaseReady() && (await pingDatabase());
    this.cachedStatus = {
      expiresAt: now + 1_000,
      ready,
      state,
    };

    return {
      ready,
      state,
    };
  }
}
