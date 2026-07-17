import type { Request, Response } from 'express';

import type { AuthService } from './auth.service';
import {
  AuthController,
  type AuthControllerOptions,
  type AuthSessionManager,
} from './auth.controller';
import { setGoogleOAuthIdentity } from './auth.oauth';
import type { AuthenticatedIdentity } from './auth.types';

const identity: AuthenticatedIdentity = {
  principal: { sessionVersion: 3, userId: '507f1f77bcf86cd799439011' },
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

const createRequest = (oauthReturnTo?: string): Request =>
  ({
    requestId: 'request-id',
    session: oauthReturnTo === undefined ? {} : { oauthReturnTo },
    validated: {},
  }) as unknown as Request;

const createResponse = (): {
  json: jest.Mock;
  redirect: jest.Mock;
  response: Response;
  status: jest.Mock;
} => {
  const status = jest.fn();
  const json = jest.fn();
  const redirect = jest.fn();
  const response = {
    json,
    redirect,
    req: { requestId: 'request-id' },
    status,
  } as unknown as Response;
  status.mockReturnValue(response);
  return { json, redirect, response, status };
};

const createController = (): {
  controller: AuthController;
  issueCsrfToken: jest.Mock;
  sessions: jest.Mocked<AuthSessionManager>;
} => {
  const sessions: jest.Mocked<AuthSessionManager> = {
    destroy: jest.fn(),
    establish: jest.fn(),
  };
  const issueCsrfToken = jest.fn().mockReturnValue('csrf-token-value');
  const options: AuthControllerOptions = {
    allowedOAuthReturnPaths: ['/dashboard', '/admin'],
    frontendUrl: 'https://app.example.com',
    issueCsrfToken,
  };

  return {
    controller: new AuthController({} as AuthService, sessions, options),
    issueCsrfToken,
    sessions,
  };
};

describe('AuthController OAuth and CSRF endpoints', () => {
  it('returns an anonymous-session CSRF token inside the standard envelope', () => {
    const { controller, issueCsrfToken } = createController();
    const request = createRequest();
    const { json, response, status } = createResponse();

    controller.csrfToken(request, response);

    expect(issueCsrfToken).toHaveBeenCalledWith(request);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      data: { csrf_token: 'csrf-token-value' },
      message: 'CSRF token issued',
      meta: { requestId: 'request-id' },
      success: true,
    });
  });

  it('captures the allowlisted return path before regenerating the custom session', async () => {
    const { controller, sessions } = createController();
    const request = createRequest('/admin');
    const { redirect, response } = createResponse();
    setGoogleOAuthIdentity(request, identity);
    sessions.establish.mockImplementation(async (incoming) => {
      expect(incoming.session.oauthReturnTo).toBeUndefined();
    });

    await controller.completeGoogleOAuth(request, response);

    expect(sessions.establish).toHaveBeenCalledWith(request, response, identity.principal);
    expect(redirect).toHaveBeenCalledWith(303, 'https://app.example.com/admin');
  });

  it('uses a fixed failure redirect when Passport did not attach an identity', async () => {
    const { controller, sessions } = createController();
    const request = createRequest('//attacker.example');
    const { redirect, response } = createResponse();

    await controller.completeGoogleOAuth(request, response);

    expect(sessions.establish).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(303, 'https://app.example.com/login?oauth=failed');
  });
});
