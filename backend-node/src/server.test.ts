import type { Server } from 'node:http';

import { createLogger } from './config/logger';
import { createShutdownHandler } from './server';
import { createTestEnvironment } from './tests/helpers/test-environment';

describe('graceful shutdown', () => {
  it('is idempotent and stops accepting HTTP before it resolves', async () => {
    const close = jest.fn((callback: (error?: Error) => void) => {
      callback();
      return {} as Server;
    });
    const closeAllConnections = jest.fn();
    const server = {
      close,
      closeAllConnections,
    } as unknown as Server;
    const logger = createLogger(createTestEnvironment());
    const shutdown = createShutdownHandler(server, logger, 1_000);

    await Promise.all([shutdown('SIGTERM'), shutdown('SIGTERM')]);

    expect(close).toHaveBeenCalledTimes(1);
    expect(closeAllConnections).not.toHaveBeenCalled();
  });
});
