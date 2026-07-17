import MongoStore from 'connect-mongo';
import type { Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import type mongoose from 'mongoose';

import type { AppError } from '../errors/AppError';
import {
  createSessionManager,
  createSessionMiddleware,
  createSessionStore,
  readSessionPrincipal,
  type SessionEnvironment,
} from './session';

jest.mock('connect-mongo', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('express-session', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const environment: SessionEnvironment = {
  COOKIE_SAME_SITE: 'lax',
  COOKIE_SECURE: true,
  SESSION_COOKIE_NAME: '__Host-bodytune.sid',
  SESSION_SECRETS: ['new-secret', 'previous-secret'],
  SESSION_TTL_SECONDS: 7_200,
};

const mongoClient = {} as ReturnType<typeof mongoose.connection.getClient>;

const makeSessionRequest = (options?: {
  destroyError?: Error;
  regenerateError?: Error;
  saveError?: Error;
}): Request => {
  const request = {} as Request;
  const createSession = (): Request['session'] =>
    ({
      cookie: {},
      destroy: jest.fn((callback: (error?: Error) => void) => {
        callback(options?.destroyError);
      }),
      regenerate: jest.fn((callback: (error?: Error) => void) => {
        if (!options?.regenerateError) {
          request.session = createSession();
        }
        callback(options?.regenerateError);
      }),
      save: jest.fn((callback: (error?: Error) => void) => {
        callback(options?.saveError);
      }),
    }) as unknown as Request['session'];

  request.session = createSession();
  return request;
};

describe('session configuration', () => {
  beforeEach(() => {
    jest.mocked(MongoStore.create).mockReset();
    jest.mocked(session).mockReset();
  });

  it('uses the existing Mongo client with a native TTL session collection', () => {
    const store = {} as MongoStore;
    jest.mocked(MongoStore.create).mockReturnValue(store);

    expect(createSessionStore(environment, mongoClient)).toBe(store);
    expect(MongoStore.create).toHaveBeenCalledWith({
      autoRemove: 'native',
      client: mongoClient,
      collectionName: 'sessions',
      ttl: environment.SESSION_TTL_SECONDS,
    });
  });

  it('creates a rolling, host-only, HttpOnly session middleware with secret rotation', () => {
    const store = {} as MongoStore;
    const middleware = jest.fn() as unknown as RequestHandler;
    jest.mocked(MongoStore.create).mockReturnValue(store);
    jest.mocked(session).mockReturnValue(middleware);

    expect(createSessionMiddleware(environment, mongoClient)).toBe(middleware);
    expect(session).toHaveBeenCalledWith({
      cookie: {
        httpOnly: true,
        maxAge: environment.SESSION_TTL_SECONDS * 1_000,
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
      name: environment.SESSION_COOKIE_NAME,
      resave: false,
      rolling: true,
      saveUninitialized: false,
      secret: ['new-secret', 'previous-secret'],
      store,
      unset: 'destroy',
    });

    const options = jest.mocked(session).mock.calls[0]?.[0];
    expect(options?.cookie).not.toHaveProperty('domain');
  });
});

describe('session lifecycle', () => {
  it('regenerates, establishes, rotates CSRF, and persists an authenticated principal', async () => {
    const request = makeSessionRequest();
    const response = { clearCookie: jest.fn() } as unknown as Response;

    await createSessionManager(environment).establish(request, response, {
      sessionVersion: 3,
      userId: 'user-id',
    });

    expect(request.session.userId).toBe('user-id');
    expect(request.session.sessionVersion).toBe(3);
    expect(request.session.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(request.session.save).toHaveBeenCalledTimes(1);
    expect(readSessionPrincipal(request)).toEqual({ sessionVersion: 3, userId: 'user-id' });
  });

  it('returns no principal for incomplete or malformed session state', () => {
    const request = makeSessionRequest();
    request.session.userId = 'user-id';
    expect(readSessionPrincipal(request)).toBeNull();

    request.session.sessionVersion = -1;
    expect(readSessionPrincipal(request)).toBeNull();

    request.session.sessionVersion = 0;
    expect(readSessionPrincipal(request)).toEqual({ sessionVersion: 0, userId: 'user-id' });
  });

  it('returns safe operational errors when regeneration or persistence fails', async () => {
    const response = { clearCookie: jest.fn() } as unknown as Response;
    const regenerateFailure = makeSessionRequest({ regenerateError: new Error('driver detail') });
    const saveFailure = makeSessionRequest({ saveError: new Error('driver detail') });

    await expect(
      createSessionManager(environment).establish(regenerateFailure, response, {
        sessionVersion: 1,
        userId: 'user-id',
      }),
    ).rejects.toMatchObject<Partial<AppError>>({
      code: 'SESSION_REGENERATION_FAILED',
      isOperational: true,
      statusCode: 500,
    });

    await expect(
      createSessionManager(environment).establish(saveFailure, response, {
        sessionVersion: 1,
        userId: 'user-id',
      }),
    ).rejects.toMatchObject<Partial<AppError>>({
      code: 'SESSION_SAVE_FAILED',
      isOperational: true,
      statusCode: 500,
    });
  });

  it('destroys the store session and clears the cookie using matching attributes', async () => {
    const request = makeSessionRequest();
    const sessionToDestroy = request.session;
    const response = { clearCookie: jest.fn() } as unknown as Response;

    await createSessionManager(environment).destroy(request, response);

    expect(sessionToDestroy.destroy).toHaveBeenCalledTimes(1);
    expect(response.clearCookie).toHaveBeenCalledWith(environment.SESSION_COOKIE_NAME, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });

  it('still clears the browser cookie when store destruction fails', async () => {
    const request = makeSessionRequest({ destroyError: new Error('driver detail') });
    const response = { clearCookie: jest.fn() } as unknown as Response;

    await expect(
      createSessionManager(environment).destroy(request, response),
    ).rejects.toMatchObject<Partial<AppError>>({
      code: 'SESSION_DESTROY_FAILED',
      isOperational: true,
      statusCode: 500,
    });
    expect(response.clearCookie).toHaveBeenCalledTimes(1);
  });
});
