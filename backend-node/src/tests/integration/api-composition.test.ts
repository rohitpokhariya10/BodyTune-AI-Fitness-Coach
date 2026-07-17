import session from 'express-session';
import request from 'supertest';

import { createApiRouter } from '../../routes';
import { createTestApp, createTestEnvironment } from '../helpers/test-environment';

describe('API composition', () => {
  it('mounts identity routes behind a session and enforces CSRF before validation', async () => {
    const environment = createTestEnvironment();
    const application = createTestApp({
      apiRouter: createApiRouter(environment),
      environment,
      sessionMiddleware: session({
        cookie: { httpOnly: true, sameSite: 'lax' },
        resave: false,
        saveUninitialized: false,
        secret: 'api-composition-test-session-secret',
      }),
    });
    const browser = request.agent(application);

    const tokenResponse = await browser.get('/api/v1/auth/csrf-token').expect(200);
    expect(tokenResponse.body).toMatchObject({
      success: true,
      data: { csrf_token: expect.any(String) },
    });
    expect(tokenResponse.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const rejected = await browser
      .post('/api/v1/auth/login')
      .set('origin', 'http://localhost:5173')
      .send({ email: 'invalid', password: '' })
      .expect(403);
    expect(rejected.body.code).toBe('CSRF_TOKEN_REQUIRED');

    const validated = await browser
      .post('/api/v1/auth/login')
      .set('origin', 'http://localhost:5173')
      .set('x-csrf-token', tokenResponse.body.data.csrf_token as string)
      .send({ email: 'invalid', password: '' })
      .expect(400);
    expect(validated.body.code).toBe('VALIDATION_ERROR');
  });

  it('mounts protected profile and workout routes', async () => {
    const environment = createTestEnvironment();
    const application = createTestApp({
      apiRouter: createApiRouter(environment),
      environment,
      sessionMiddleware: session({
        resave: false,
        saveUninitialized: false,
        secret: 'api-composition-test-session-secret',
      }),
    });

    await request(application).get('/api/v1/profiles/me').expect(401);
    await request(application).get('/api/v1/workouts/summary').expect(401);
    await request(application).post('/api/v1/workout-sessions/complete').expect(401);
  });
});
