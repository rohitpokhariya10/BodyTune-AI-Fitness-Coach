import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError';
import {
  CSRF_HEADER_NAME,
  createCsrfMiddleware,
  issueCsrfToken,
  rotateCsrfToken,
} from './csrf.middleware';

const allowedOrigin = 'https://app.example.com';

const makeRequest = (
  method = 'POST',
  headers: Record<string, string | string[] | undefined> = {},
): Request =>
  ({
    headers,
    method,
    session: {
      cookie: {},
    },
  }) as Request;

const execute = (
  request: Request,
): { error: AppError | undefined; next: jest.MockedFunction<NextFunction> } => {
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  createCsrfMiddleware({ CORS_ORIGINS: [allowedOrigin] })(request, {} as Response, next);
  const error = next.mock.calls[0]?.[0] as unknown;
  return { error: error instanceof AppError ? error : undefined, next };
};

describe('CSRF token lifecycle', () => {
  it('issues one bounded token per session and reuses it until rotation', () => {
    const request = makeRequest('GET');
    const first = issueCsrfToken(request);
    const second = issueCsrfToken(request);
    const rotated = rotateCsrfToken(request);

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toBe(first);
    expect(rotated).not.toBe(first);
    expect(request.session.csrfToken).toBe(rotated);
  });

  it('fails safely when session middleware has not run', () => {
    const request = makeRequest('GET');
    Object.defineProperty(request, 'session', { configurable: true, value: undefined });

    expect(() => issueCsrfToken(request)).toThrow(
      expect.objectContaining<Partial<AppError>>({
        code: 'CSRF_SESSION_UNAVAILABLE',
        isOperational: true,
        statusCode: 500,
      }),
    );
  });
});

describe('CSRF middleware', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'allows safe %s requests without session mutation',
    (method) => {
      const request = makeRequest(method);
      const { error, next } = execute(request);

      expect(error).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
      expect(request.session.csrfToken).toBeUndefined();
    },
  );

  it('accepts an exact allowlisted Origin and timing-safe token match', () => {
    const request = makeRequest('PATCH', { origin: allowedOrigin });
    const token = issueCsrfToken(request);
    request.headers[CSRF_HEADER_NAME] = token;

    const { error, next } = execute(request);

    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('accepts an allowlisted Referer origin when Origin is absent', () => {
    const request = makeRequest('DELETE', { referer: `${allowedOrigin}/settings/profile` });
    request.headers[CSRF_HEADER_NAME] = issueCsrfToken(request);

    expect(execute(request).error).toBeUndefined();
  });

  it('rejects unsafe requests with no verifiable source', () => {
    const request = makeRequest();
    request.headers[CSRF_HEADER_NAME] = issueCsrfToken(request);

    expect(execute(request).error).toMatchObject<Partial<AppError>>({
      code: 'CSRF_ORIGIN_REQUIRED',
      isOperational: true,
      statusCode: 403,
    });
  });

  it.each([
    { origin: 'https://evil.example' },
    { referer: 'https://evil.example/path' },
    { referer: 'not-a-url' },
    { origin: allowedOrigin, referer: 'https://evil.example/path' },
  ])('rejects a non-allowlisted or malformed source: %j', (headers) => {
    const request = makeRequest('POST', headers);
    request.headers[CSRF_HEADER_NAME] = issueCsrfToken(request);

    expect(execute(request).error).toMatchObject<Partial<AppError>>({
      code: 'CSRF_ORIGIN_DENIED',
      statusCode: 403,
    });
  });

  it('rejects a missing CSRF header with a safe error', () => {
    const request = makeRequest('POST', { origin: allowedOrigin });
    issueCsrfToken(request);

    expect(execute(request).error).toMatchObject<Partial<AppError>>({
      code: 'CSRF_TOKEN_REQUIRED',
      statusCode: 403,
    });
  });

  it.each([
    'wrong-token-that-is-long-enough-for-validation',
    'short',
    'x'.repeat(129),
    ['array-token-that-is-invalid'],
  ])('rejects invalid or unbounded CSRF token input', (supplied) => {
    const request = makeRequest('POST', {
      [CSRF_HEADER_NAME]: supplied,
      origin: allowedOrigin,
    });
    issueCsrfToken(request);

    expect(execute(request).error).toMatchObject<Partial<AppError>>({
      code: 'CSRF_TOKEN_INVALID',
      statusCode: 403,
    });
  });

  it('rejects an unsafe request if session middleware is unavailable', () => {
    const request = makeRequest('POST', {
      [CSRF_HEADER_NAME]: 'x'.repeat(43),
      origin: allowedOrigin,
    });
    Object.defineProperty(request, 'session', { configurable: true, value: undefined });

    expect(execute(request).error).toMatchObject<Partial<AppError>>({
      code: 'CSRF_SESSION_UNAVAILABLE',
      statusCode: 500,
    });
  });
});
