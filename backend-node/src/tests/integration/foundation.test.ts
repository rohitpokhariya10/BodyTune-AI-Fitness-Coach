import { Router } from 'express';
import request from 'supertest';
import { z } from 'zod';

import { sendSuccess } from '../../shared/http/response';
import { validateRequest } from '../../middlewares/validation.middleware';
import {
  createTestApp,
  createTestEnvironment,
  FakeHealthRepository,
} from '../helpers/test-environment';

describe('Express foundation', () => {
  it('reports liveness without depending on MongoDB', async () => {
    const application = createTestApp({
      healthRepository: new FakeHealthRepository(false, 'disconnected'),
    });

    const response = await request(application).get('/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Service is alive',
      data: {
        status: 'ok',
      },
      meta: {
        requestId: expect.any(String),
      },
    });
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('reports readiness only when MongoDB is available', async () => {
    const repository = new FakeHealthRepository(false, 'disconnected');
    const application = createTestApp({ healthRepository: repository });

    const unavailable = await request(application).get('/ready').expect(503);

    expect(unavailable.body).toEqual({
      success: false,
      message: 'Service is not ready',
      code: 'DATABASE_UNAVAILABLE',
      errors: [],
      requestId: unavailable.headers['x-request-id'],
    });
    expect(JSON.stringify(unavailable.body)).not.toContain('mongodb://');
    expect(JSON.stringify(unavailable.body)).not.toContain('disconnected');

    repository.ready = true;
    repository.state = 'connected';

    const available = await request(application).get('/ready').expect(200);

    expect(available.body).toMatchObject({
      success: true,
      data: {
        checks: {
          database: 'up',
        },
        status: 'ready',
      },
    });
  });

  it('uses bounded caller request IDs and replaces invalid values', async () => {
    const application = createTestApp();

    const accepted = await request(application)
      .get('/health')
      .set('x-request-id', 'client-request-123')
      .expect(200);
    expect(accepted.headers['x-request-id']).toBe('client-request-123');

    const replaced = await request(application)
      .get('/health')
      .set('x-request-id', 'short')
      .expect(200);
    expect(replaced.headers['x-request-id']).not.toBe('short');
    expect(replaced.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('enforces the exact credentialed CORS allowlist and supports preflight', async () => {
    const application = createTestApp();

    const allowed = await request(application)
      .get('/health')
      .set('origin', 'http://localhost:5173')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const preflight = await request(application)
      .options('/api/v1/example')
      .set('origin', 'http://localhost:5173')
      .set('access-control-request-method', 'POST')
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const denied = await request(application)
      .get('/health')
      .set('origin', 'https://evil.example')
      .expect(403);
    expect(denied.body.code).toBe('AUTHORIZATION_DENIED');
  });

  it('returns the standard not-found envelope', async () => {
    const application = createTestApp();
    const response = await request(application).get('/api/v1/unknown').expect(404);

    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
      code: 'RESOURCE_NOT_FOUND',
      errors: [],
      requestId: response.headers['x-request-id'],
    });
  });

  it('formats Zod failures without calling the controller', async () => {
    const router = Router();
    const controller = jest.fn((_request, response) => {
      sendSuccess(response, {
        data: {},
        message: 'Validated',
      });
    });

    router.post(
      '/validated',
      validateRequest({
        body: z
          .object({
            name: z.string().min(2),
          })
          .strict(),
      }),
      controller,
    );

    const application = createTestApp({ apiRouter: router });
    const response = await request(application)
      .post('/api/v1/validated')
      .send({ name: '' })
      .expect(400);

    expect(controller).not.toHaveBeenCalled();
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.errors).toEqual([
      expect.objectContaining({
        field: 'name',
      }),
    ]);
  });

  it('maps malformed and oversized JSON safely', async () => {
    const router = Router();
    router.post('/payload', (_request, response) => response.sendStatus(204));
    const environment = createTestEnvironment({ REQUEST_BODY_LIMIT: '32b' });
    const application = createTestApp({ apiRouter: router, environment });

    const malformed = await request(application)
      .post('/api/v1/payload')
      .set('content-type', 'application/json')
      .send('{')
      .expect(400);
    expect(malformed.body.code).toBe('VALIDATION_ERROR');

    const oversized = await request(application)
      .post('/api/v1/payload')
      .send({ content: 'a'.repeat(100) })
      .expect(413);
    expect(oversized.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects MongoDB operator keys before a feature handler runs', async () => {
    const application = createTestApp();
    const response = await request(application)
      .get('/api/v1/unknown?filter[$ne]=admin')
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.message).toBe('Unsafe request key rejected');
  });

  it('returns rejected async handlers to the global error middleware once', async () => {
    const router = Router();
    router.get('/explode', () => Promise.reject(new Error('private implementation detail')));
    const environment = createTestEnvironment({
      AUTH_GOOGLE_ENABLED: 'true',
      AUTH_LOCAL_ENABLED: 'false',
      COOKIE_SECURE: 'true',
      CORS_ORIGINS: 'https://app.example.com',
      FRONTEND_URL: 'https://app.example.com',
      GOOGLE_CALLBACK_URL: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_CLIENT_ID: 'foundation-test-client-id',
      GOOGLE_CLIENT_SECRET: 'foundation-test-client-secret',
      MONGODB_URI: 'mongodb+srv://service:secret@cluster.example.com/bodytune',
      NODE_ENV: 'production',
      SESSION_COOKIE_NAME: '__Host-bodytune.sid',
      SESSION_SECRETS: '65d885b4e95ce00217fef04222855b34011f709fdc7d519601c5e2f7c04c8f29',
      TRUST_PROXY: '1',
    });
    const application = createTestApp({ apiRouter: router, environment });

    const response = await request(application).get('/api/v1/explode').expect(500);

    expect(response.body).toEqual({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      errors: [],
      requestId: response.headers['x-request-id'],
    });
    expect(JSON.stringify(response.body)).not.toContain('private implementation detail');
  });

  it('applies the global limiter to API routes but not health probes', async () => {
    const environment = createTestEnvironment({
      GLOBAL_RATE_LIMIT_MAX: '1',
      GLOBAL_RATE_LIMIT_WINDOW_MS: '60000',
    });
    const application = createTestApp({ environment });

    await request(application).get('/api/v1/unknown').expect(404);
    const limited = await request(application).get('/api/v1/unknown').expect(429);
    expect(limited.body.code).toBe('RATE_LIMIT_EXCEEDED');

    await request(application).get('/health').expect(200);
    await request(application).get('/health').expect(200);
  });
});
