import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type { Request, RequestHandler } from 'express';

import { AppError } from '../errors/AppError';

export const CSRF_HEADER_NAME = 'x-csrf-token';

const CSRF_TOKEN_BYTES = 32;
const CSRF_TOKEN_MIN_LENGTH = 32;
const CSRF_TOKEN_MAX_LENGTH = 128;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface CsrfEnvironment {
  CORS_ORIGINS: string[];
}

const csrfError = (message: string, code: string): AppError =>
  new AppError(message, {
    code,
    isOperational: true,
    statusCode: 403,
  });

const requireSession = (request: Request): Express.Request['session'] => {
  const session = Reflect.get(request, 'session') as unknown;

  if (typeof session !== 'object' || session === null) {
    throw new AppError('CSRF protection is unavailable', {
      code: 'CSRF_SESSION_UNAVAILABLE',
      isOperational: true,
      statusCode: 500,
    });
  }

  return session as Express.Request['session'];
};

const isBoundedToken = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length >= CSRF_TOKEN_MIN_LENGTH &&
  value.length <= CSRF_TOKEN_MAX_LENGTH;

const digestToken = (token: string): Buffer => createHash('sha256').update(token).digest();

const tokensMatch = (actual: string, expected: string): boolean =>
  timingSafeEqual(digestToken(actual), digestToken(expected));

const singleHeader = (request: Request, name: string): string | undefined => {
  const value = request.headers[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const refererOrigin = (referer: string): string | null => {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const validateRequestSource = (request: Request, allowedOrigins: ReadonlySet<string>): void => {
  const origin = singleHeader(request, 'origin');
  const referer = singleHeader(request, 'referer');

  if (origin === undefined && referer === undefined) {
    throw csrfError('A verifiable request origin is required', 'CSRF_ORIGIN_REQUIRED');
  }

  if (origin !== undefined && !allowedOrigins.has(origin)) {
    throw csrfError('The request origin is not allowed', 'CSRF_ORIGIN_DENIED');
  }

  if (referer !== undefined) {
    const parsedOrigin = refererOrigin(referer);

    if (parsedOrigin === null || !allowedOrigins.has(parsedOrigin)) {
      throw csrfError('The request origin is not allowed', 'CSRF_ORIGIN_DENIED');
    }
  }
};

const validateToken = (request: Request): void => {
  const session = requireSession(request);
  const expected = session.csrfToken;
  const supplied = request.headers[CSRF_HEADER_NAME];

  if (supplied === undefined || supplied === '') {
    throw csrfError('A CSRF token is required', 'CSRF_TOKEN_REQUIRED');
  }

  if (!isBoundedToken(supplied) || !isBoundedToken(expected) || !tokensMatch(supplied, expected)) {
    throw csrfError('The CSRF token is invalid', 'CSRF_TOKEN_INVALID');
  }
};

export const rotateCsrfToken = (request: Request): string => {
  const token = randomBytes(CSRF_TOKEN_BYTES).toString('base64url');
  requireSession(request).csrfToken = token;
  return token;
};

export const issueCsrfToken = (request: Request): string => {
  const token = requireSession(request).csrfToken;
  return isBoundedToken(token) ? token : rotateCsrfToken(request);
};

export const createCsrfMiddleware = (environment: CsrfEnvironment): RequestHandler => {
  const allowedOrigins = new Set(environment.CORS_ORIGINS);

  return (request, _response, next): void => {
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      next();
      return;
    }

    try {
      validateRequestSource(request, allowedOrigins);
      validateToken(request);
      next();
    } catch (error) {
      next(error);
    }
  };
};
