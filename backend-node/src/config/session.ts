import MongoStore from 'connect-mongo';
import type { Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import mongoose from 'mongoose';

import { AppError } from '../errors/AppError';
import { rotateCsrfToken } from '../middlewares/csrf.middleware';

const SESSION_COLLECTION_NAME = 'sessions';

type MongoClient = ReturnType<typeof mongoose.connection.getClient>;
type SessionStoreClient = NonNullable<Parameters<typeof MongoStore.create>[0]['client']>;

export interface SessionEnvironment {
  COOKIE_SAME_SITE: 'lax' | 'none' | 'strict';
  COOKIE_SECURE: boolean;
  SESSION_COOKIE_NAME: string;
  SESSION_SECRETS: string[];
  SESSION_TTL_SECONDS: number;
}

export interface SessionPrincipal {
  sessionVersion: number;
  userId: string;
}

export interface SessionManager {
  destroy(request: Request, response: Response): Promise<void>;
  establish(request: Request, response: Response, principal: SessionPrincipal): Promise<void>;
}

const sessionError = (message: string, code: string, cause: unknown): AppError =>
  new AppError(message, {
    cause,
    code,
    isOperational: true,
    statusCode: 500,
  });

const ensureError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('Unknown session store error');

const regenerateSession = async (request: Request): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) {
        reject(ensureError(error));
        return;
      }

      resolve();
    });
  }).catch((error: unknown) => {
    throw sessionError(
      'The session could not be established',
      'SESSION_REGENERATION_FAILED',
      error,
    );
  });
};

const saveSession = async (request: Request): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    request.session.save((error) => {
      if (error) {
        reject(ensureError(error));
        return;
      }

      resolve();
    });
  }).catch((error: unknown) => {
    throw sessionError('The session could not be saved', 'SESSION_SAVE_FAILED', error);
  });
};

const destroySession = async (request: Request): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) {
        reject(ensureError(error));
        return;
      }

      resolve();
    });
  }).catch((error: unknown) => {
    throw sessionError('The session could not be destroyed', 'SESSION_DESTROY_FAILED', error);
  });
};

const clearSessionCookie = (response: Response, environment: SessionEnvironment): void => {
  response.clearCookie(environment.SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: '/',
    sameSite: environment.COOKIE_SAME_SITE,
    secure: environment.COOKIE_SECURE,
  });
};

export const createSessionStore = (
  environment: SessionEnvironment,
  client: MongoClient = mongoose.connection.getClient(),
): MongoStore => {
  // Mongoose and connect-mongo currently resolve different MongoDB driver patch versions.
  // Both expose the same runtime client, but their private type identities are incompatible.
  const sessionStoreClient = client as unknown as SessionStoreClient;

  return MongoStore.create({
    autoRemove: 'native',
    client: sessionStoreClient,
    collectionName: SESSION_COLLECTION_NAME,
    ttl: environment.SESSION_TTL_SECONDS,
  });
};

export const createSessionMiddleware = (
  environment: SessionEnvironment,
  client?: MongoClient,
): RequestHandler => {
  const store =
    client === undefined
      ? createSessionStore(environment)
      : createSessionStore(environment, client);

  return session({
    cookie: {
      httpOnly: true,
      maxAge: environment.SESSION_TTL_SECONDS * 1_000,
      path: '/',
      sameSite: environment.COOKIE_SAME_SITE,
      secure: environment.COOKIE_SECURE,
    },
    name: environment.SESSION_COOKIE_NAME,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret: [...environment.SESSION_SECRETS],
    store,
    unset: 'destroy',
  });
};

export const readSessionPrincipal = (request: Request): SessionPrincipal | null => {
  const { sessionVersion, userId } = request.session;

  if (
    typeof userId !== 'string' ||
    userId.length === 0 ||
    typeof sessionVersion !== 'number' ||
    !Number.isSafeInteger(sessionVersion) ||
    sessionVersion < 0
  ) {
    return null;
  }

  return { sessionVersion, userId };
};

export const createSessionManager = (environment: SessionEnvironment): SessionManager => ({
  async destroy(request, response): Promise<void> {
    try {
      await destroySession(request);
    } finally {
      clearSessionCookie(response, environment);
    }
  },

  async establish(request, _response, principal): Promise<void> {
    await regenerateSession(request);
    request.session.userId = principal.userId;
    request.session.sessionVersion = principal.sessionVersion;
    rotateCsrfToken(request);
    await saveSession(request);
  },
});
