import type { Request } from 'express';

import { ValidationError } from '../../errors/ValidationError';
import type { AuthenticatedIdentity } from './auth.types';

const oauthIdentityKey: unique symbol = Symbol('bodytune.googleOAuthIdentity');

interface OAuthIdentityRequest extends Request {
  [oauthIdentityKey]?: AuthenticatedIdentity;
}

export const setGoogleOAuthIdentity = (request: Request, identity: AuthenticatedIdentity): void => {
  (request as OAuthIdentityRequest)[oauthIdentityKey] = identity;
};

export const getGoogleOAuthIdentity = (request: Request): AuthenticatedIdentity | null =>
  (request as OAuthIdentityRequest)[oauthIdentityKey] ?? null;

export const defaultOAuthReturnPath = (allowedPaths: readonly string[]): string => {
  const preferred = allowedPaths.find((path) => path === '/dashboard');
  const fallback = allowedPaths[0];

  if (preferred !== undefined) {
    return preferred;
  }

  if (fallback === undefined) {
    throw new Error('At least one OAuth return path must be configured');
  }

  return fallback;
};

export const validateOAuthReturnPath = (
  candidate: unknown,
  allowedPaths: readonly string[],
): string => {
  const fallback = defaultOAuthReturnPath(allowedPaths);
  if (candidate === undefined) {
    return fallback;
  }

  if (typeof candidate !== 'string' || !allowedPaths.includes(candidate)) {
    throw new ValidationError('OAuth return path is not allowed', [
      { field: 'return_to', message: 'Select an allowed application return path' },
    ]);
  }

  return candidate;
};

export const consumeOAuthReturnPath = (
  storedPath: unknown,
  allowedPaths: readonly string[],
): string =>
  typeof storedPath === 'string' && allowedPaths.includes(storedPath)
    ? storedPath
    : defaultOAuthReturnPath(allowedPaths);

export const buildFrontendRedirect = (
  frontendUrl: string,
  path: string,
  oauthStatus?: 'failed',
): string => {
  const destination = new URL(frontendUrl);
  destination.pathname = path;
  destination.search = '';
  destination.hash = '';

  if (oauthStatus === 'failed') {
    destination.searchParams.set('oauth', 'failed');
  }

  return destination.toString();
};
