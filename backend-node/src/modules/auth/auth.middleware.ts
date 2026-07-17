import type { Request, RequestHandler } from 'express';

import { AuthenticationError } from '../../errors/AuthenticationError';
import { AuthorizationError } from '../../errors/AuthorizationError';
import type { SafeUserDto, UserRole } from '../users/user.types';
import type { AuthService } from './auth.service';
import type { SessionPrincipal } from './auth.types';

export const authenticatedUserKey: unique symbol = Symbol('bodytune.authenticatedUser');

export interface IdentityRequest extends Request {
  [authenticatedUserKey]?: SafeUserDto;
}

export type SessionPrincipalReader = (request: Request) => SessionPrincipal | null;

export const getAuthenticatedUser = (request: Request): SafeUserDto => {
  const user = (request as IdentityRequest)[authenticatedUserKey];
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
};

export const createAuthenticationMiddleware =
  (authService: AuthService, readPrincipal: SessionPrincipalReader): RequestHandler =>
  async (request, _response, next) => {
    try {
      const principal = readPrincipal(request);
      if (!principal) {
        throw new AuthenticationError();
      }

      const identity = await authService.getSessionIdentity(principal);
      if (!identity) {
        throw new AuthenticationError('The session is invalid or has expired');
      }

      (request as IdentityRequest)[authenticatedUserKey] = identity.user;
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (request, _response, next) => {
    try {
      const user = getAuthenticatedUser(request);
      if (!roles.includes(user.role)) {
        throw new AuthorizationError();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
