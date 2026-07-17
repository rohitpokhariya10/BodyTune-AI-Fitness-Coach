import { setTimeout as delay } from 'node:timers/promises';

import mongoose from 'mongoose';
import type { Logger } from 'pino';

import { DatabaseError } from '../errors/DatabaseError';
import type { Environment } from './env';

export type DatabaseState =
  'connected' | 'connecting' | 'disconnected' | 'disconnecting' | 'unknown';

let connectionPromise: Promise<void> | undefined;
let isShuttingDown = false;
let listenersRegistered = false;

const registerConnectionListeners = (logger: Logger): void => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection closed');
  });

  mongoose.connection.on('error', (error: Error) => {
    logger.error({ errorType: error.name }, 'MongoDB connection error');
  });
};

export const getDatabaseState = (): DatabaseState => {
  switch (mongoose.connection.readyState) {
    case mongoose.ConnectionStates.disconnected:
      return 'disconnected';
    case mongoose.ConnectionStates.connected:
      return 'connected';
    case mongoose.ConnectionStates.connecting:
      return 'connecting';
    case mongoose.ConnectionStates.disconnecting:
      return 'disconnecting';
    default:
      return 'unknown';
  }
};

export const isDatabaseReady = (): boolean => !isShuttingDown && getDatabaseState() === 'connected';

export const pingDatabase = async (): Promise<boolean> => {
  if (!isDatabaseReady() || !mongoose.connection.db) {
    return false;
  }

  try {
    await mongoose.connection.db.admin().command(
      { ping: 1 },
      {
        timeoutMS: 1_000,
      },
    );
    return true;
  } catch {
    return false;
  }
};

const establishConnection = async (environment: Environment, logger: Logger): Promise<void> => {
  if (isDatabaseReady()) {
    return;
  }

  isShuttingDown = false;
  registerConnectionListeners(logger);
  mongoose.set('bufferCommands', false);
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= environment.MONGODB_CONNECT_MAX_ATTEMPTS; attempt += 1) {
    try {
      logger.info(
        {
          attempt,
          maxAttempts: environment.MONGODB_CONNECT_MAX_ATTEMPTS,
        },
        'Connecting to MongoDB',
      );

      await mongoose.connect(environment.MONGODB_URI, {
        autoIndex: environment.NODE_ENV !== 'production',
        maxPoolSize: environment.MONGODB_MAX_POOL_SIZE,
        serverSelectionTimeoutMS: environment.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      });

      return;
    } catch (error) {
      logger.warn(
        {
          attempt,
          errorType: error instanceof Error ? error.name : 'UnknownError',
          maxAttempts: environment.MONGODB_CONNECT_MAX_ATTEMPTS,
        },
        'MongoDB connection attempt failed',
      );

      if (attempt === environment.MONGODB_CONNECT_MAX_ATTEMPTS) {
        throw new DatabaseError('MongoDB connection could not be established', error);
      }

      const jitter = Math.floor(Math.random() * 250);
      await delay(environment.MONGODB_CONNECT_RETRY_DELAY_MS * attempt + jitter);
    }
  }
};

export const connectDatabase = async (environment: Environment, logger: Logger): Promise<void> => {
  connectionPromise ??= establishConnection(environment, logger).finally(() => {
    connectionPromise = undefined;
  });

  return connectionPromise;
};

export const beginDatabaseShutdown = (): void => {
  isShuttingDown = true;
};

export const disconnectDatabase = async (): Promise<void> => {
  beginDatabaseShutdown();

  if (getDatabaseState() === 'disconnected') {
    return;
  }

  await mongoose.disconnect();
};
