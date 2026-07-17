import type { RequestHandler, Router } from 'express';

import type { AuthController } from './auth.controller';
import { createAuthRouter, type AuthRouterDependencies } from './auth.routes';

const noop: RequestHandler = (_request, _response, next) => {
  next();
};

const controller = {
  completeGoogleOAuth: noop,
  csrfToken: noop,
  forgotPassword: noop,
  login: noop,
  logout: noop,
  me: noop,
  register: noop,
  resendOtp: noop,
  resetPassword: noop,
  verifyOtp: noop,
} as unknown as AuthController;

const dependencies = (overrides: Partial<AuthRouterDependencies> = {}): AuthRouterDependencies => ({
  authenticate: noop,
  controller,
  csrfProtection: noop,
  localAuthEnabled: true,
  rateLimits: {
    login: noop,
    otp: noop,
    passwordRecovery: noop,
    registration: noop,
  },
  ...overrides,
});

interface RouterLayer {
  route?: { path: string };
}

const paths = (router: Router): string[] =>
  (router as unknown as { stack: RouterLayer[] }).stack
    .map((layer) => layer.route?.path)
    .filter((path): path is string => path !== undefined);

describe('authentication route composition', () => {
  it('does not mount local identity routes when local auth is disabled', () => {
    const routePaths = paths(createAuthRouter(dependencies({ localAuthEnabled: false })));

    expect(routePaths).toEqual(['/csrf-token', '/me', '/logout']);
    expect(routePaths).not.toContain('/register');
    expect(routePaths).not.toContain('/forgot-password');
  });

  it('keeps session routes and mounts optional Google routes independently', () => {
    const routePaths = paths(
      createAuthRouter(
        dependencies({
          googleOAuth: { callback: noop, initialize: noop, start: noop },
          localAuthEnabled: false,
        }),
      ),
    );

    expect(routePaths).toEqual(['/csrf-token', '/me', '/logout', '/google', '/google/callback']);
  });
});
