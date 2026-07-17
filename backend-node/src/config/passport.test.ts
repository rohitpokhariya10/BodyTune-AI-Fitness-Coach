import express, { type ErrorRequestHandler } from 'express';
import session from 'express-session';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import request from 'supertest';

import { ValidationError } from '../errors/ValidationError';
import type { AuthenticatedIdentity } from '../modules/auth/auth.types';
import {
  createGooglePassport,
  createGoogleVerifyCallback,
  googleProfileIdentity,
  type GoogleIdentityAuthenticator,
  type GoogleOAuthEnvironment,
} from './passport';

const environment = (overrides: Partial<GoogleOAuthEnvironment> = {}): GoogleOAuthEnvironment => ({
  AUTH_GOOGLE_ENABLED: true,
  FRONTEND_URL: 'http://localhost:5173',
  GOOGLE_CALLBACK_URL: 'http://localhost:9000/api/v1/auth/google/callback',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  OAUTH_ALLOWED_RETURN_PATHS: ['/dashboard', '/admin'],
  ...overrides,
});

const authenticatedIdentity: AuthenticatedIdentity = {
  principal: { sessionVersion: 0, userId: '507f1f77bcf86cd799439011' },
  user: {
    age: null,
    created_at: '2026-07-18T00:00:00.000Z',
    email: 'user@example.com',
    experience_level: 'beginner',
    fitness_goal: 'general_fitness',
    height_cm: null,
    id: '507f1f77bcf86cd799439011',
    is_verified: true,
    name: 'BodyTune User',
    role: 'user',
    updated_at: '2026-07-18T00:00:00.000Z',
    weight_kg: null,
  },
};

const authenticator = (): jest.Mocked<GoogleIdentityAuthenticator> => ({
  authenticateGoogleIdentity: jest.fn().mockResolvedValue(authenticatedIdentity),
});

const googleProfile = (verified: boolean): GoogleProfile => ({
  _json: {
    aud: 'google-client-id',
    email: 'user@example.com',
    email_verified: verified,
    exp: 2_000_000_000,
    iat: 1_999_999_000,
    iss: 'https://accounts.google.com',
    sub: 'google-subject',
  },
  _raw: '{}',
  displayName: 'BodyTune User',
  emails: [{ value: 'user@example.com', verified }],
  id: 'google-subject',
  name: { familyName: 'User', givenName: 'BodyTune' },
  photos: [],
  profileUrl: 'https://profiles.google.com/google-subject',
  provider: 'google',
});

describe('Google Passport adapter', () => {
  it('is absent when Google authentication is disabled', () => {
    expect(
      createGooglePassport(environment({ AUTH_GOOGLE_ENABLED: false }), authenticator()),
    ).toBeNull();
  });

  it('fails closed when an enabled provider is not fully configured', () => {
    expect(() =>
      createGooglePassport(environment({ GOOGLE_CLIENT_SECRET: undefined }), authenticator()),
    ).toThrow('Google OAuth is enabled');
  });

  it('creates isolated Passport instances and accepts only verified Google email', () => {
    const first = createGooglePassport(environment(), authenticator());
    const second = createGooglePassport(environment(), authenticator());

    expect(first?.passport).not.toBe(second?.passport);
    expect(googleProfileIdentity(googleProfile(true))).toEqual({
      displayName: 'BodyTune User',
      email: 'user@example.com',
      emailVerified: true,
      subject: 'google-subject',
    });
    expect(googleProfileIdentity(googleProfile(false))).toBeNull();
  });

  it('passes only the verified identity projection to the domain service', async () => {
    const identityAuthenticator = authenticator();
    const verify = createGoogleVerifyCallback(identityAuthenticator);

    await new Promise<void>((resolve, reject) => {
      verify(
        'provider-access-token-must-not-be-persisted',
        'provider-refresh-token-must-not-be-persisted',
        googleProfile(true),
        (error, user) => {
          if (error) {
            reject(error instanceof Error ? error : new Error('Google verification failed'));
            return;
          }
          expect(user).toEqual(authenticatedIdentity);
          resolve();
        },
      );
    });

    expect(identityAuthenticator.authenticateGoogleIdentity).toHaveBeenCalledWith({
      displayName: 'BodyTune User',
      email: 'user@example.com',
      emailVerified: true,
      subject: 'google-subject',
    });
    const calls = JSON.stringify(identityAuthenticator.authenticateGoogleIdentity.mock.calls);
    expect(calls).not.toContain('provider-access-token');
    expect(calls).not.toContain('provider-refresh-token');
  });

  it('stores an allowlisted return path and sends an opaque state value', async () => {
    const adapter = createGooglePassport(environment(), authenticator());
    expect(adapter).not.toBeNull();

    const app = express();
    app.use(
      session({
        resave: false,
        saveUninitialized: false,
        secret: 'test-session-secret-that-is-long-enough-for-google-state-tests',
      }),
    );
    if (!adapter) {
      throw new Error('Expected Google adapter');
    }
    app.use(adapter.initialize);
    app.get('/auth/google', adapter.start);
    app.get('/inspect', (incoming, response) => {
      response.json({ returnTo: incoming.session.oauthReturnTo });
    });

    const agent = request.agent(app);
    const start = await agent.get('/auth/google').query({ return_to: '/admin' });
    const location = start.headers.location;
    if (typeof location !== 'string') {
      throw new Error('Expected Google authorization redirect');
    }
    const redirect = new URL(location);

    expect(start.status).toBe(302);
    expect(redirect.origin).toBe('https://accounts.google.com');
    expect(redirect.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(redirect.searchParams.get('scope')).toContain('email');
    await expect(agent.get('/inspect')).resolves.toMatchObject({
      body: { returnTo: '/admin' },
      status: 200,
    });
  });

  it('rejects unallowlisted return paths before redirecting to Google', async () => {
    const adapter = createGooglePassport(environment(), authenticator());
    expect(adapter).not.toBeNull();

    const app = express();
    app.use(
      session({
        resave: false,
        saveUninitialized: false,
        secret: 'test-session-secret-that-is-long-enough-for-google-state-tests',
      }),
    );
    if (!adapter) {
      throw new Error('Expected Google adapter');
    }
    app.get('/auth/google', adapter.start);
    const errors: ErrorRequestHandler = (error, _request, response, _next) => {
      void _next;
      response.status(error instanceof ValidationError ? 400 : 500).json({ rejected: true });
    };
    app.use(errors);

    const result = await request(app)
      .get('/auth/google')
      .query({ return_to: '//attacker.example' });

    expect(result.status).toBe(400);
    expect(result.headers.location).toBeUndefined();
  });

  it('redirects invalid state to one fixed non-sensitive frontend URL', async () => {
    const identityAuthenticator = authenticator();
    const adapter = createGooglePassport(environment(), identityAuthenticator);
    expect(adapter).not.toBeNull();

    const app = express();
    app.use(
      session({
        resave: false,
        saveUninitialized: false,
        secret: 'test-session-secret-that-is-long-enough-for-google-state-tests',
      }),
    );
    if (!adapter) {
      throw new Error('Expected Google adapter');
    }
    app.use(adapter.initialize);
    app.get('/auth/google', adapter.start);
    app.get('/auth/google/callback', adapter.callback, (_request, response) => {
      response.sendStatus(204);
    });

    const agent = request.agent(app);
    await agent.get('/auth/google');
    const callback = await agent
      .get('/auth/google/callback')
      .query({ code: 'provider-code-that-must-not-leak', state: 'invalid-state' });

    expect(callback.status).toBe(303);
    expect(callback.headers.location).toBe('http://localhost:5173/login?oauth=failed');
    expect(callback.headers.location).not.toContain('provider-code');
    expect(identityAuthenticator.authenticateGoogleIdentity).not.toHaveBeenCalled();
  });
});
