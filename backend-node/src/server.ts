import { createServer, type Server } from 'node:http';

import type { Logger } from 'pino';

import { createApp } from './app';
import { beginDatabaseShutdown, connectDatabase, disconnectDatabase } from './config/database';
import { loadEnvironment } from './config/env';
import { createLogger } from './config/logger';

const listen = async (server: Server, port: number): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.off('error', reject);
      resolve();
    });
  });
};

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

export const createShutdownHandler = (
  server: Server,
  logger: Logger,
  timeoutMs: number,
): ((signal: string) => Promise<void>) => {
  let shutdownPromise: Promise<void> | undefined;

  return (signal: string): Promise<void> => {
    shutdownPromise ??= (async () => {
      logger.info({ signal }, 'Graceful shutdown started');
      beginDatabaseShutdown();

      const forceCloseTimer = setTimeout(() => {
        logger.error('Graceful shutdown deadline exceeded');
        server.closeAllConnections();
      }, timeoutMs);
      forceCloseTimer.unref();

      try {
        await closeServer(server);
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
      } finally {
        clearTimeout(forceCloseTimer);
        logger.flush();
      }
    })();

    return shutdownPromise;
  };
};

export const startServer = async (): Promise<Server> => {
  const environment = loadEnvironment();
  const logger = createLogger(environment);

  await connectDatabase(environment, logger);

  const app = createApp({ environment, logger });
  const server = createServer(app);
  const shutdown = createShutdownHandler(server, logger, environment.SHUTDOWN_TIMEOUT_MS);

  await listen(server, environment.PORT);
  logger.info({ port: environment.PORT }, 'BodyTune API listening');

  const shutdownAndExit = (signal: string, exitCode: number): void => {
    void shutdown(signal)
      .then(() => {
        process.exit(exitCode);
      })
      .catch(() => {
        process.exit(1);
      });
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      shutdownAndExit(signal, 0);
    });
  }

  process.once('unhandledRejection', (error) => {
    logger.fatal(
      { errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Unhandled promise rejection',
    );
    shutdownAndExit('unhandledRejection', 1);
  });

  process.once('uncaughtException', (error) => {
    logger.fatal({ errorType: error.name }, 'Uncaught exception');
    shutdownAndExit('uncaughtException', 1);
  });

  return server;
};

if (require.main === module) {
  void startServer().catch(() => {
    process.stderr.write('BodyTune API failed to start\n');
    process.exit(1);
  });
}
