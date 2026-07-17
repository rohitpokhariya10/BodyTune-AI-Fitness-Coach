import type { Request, Response } from 'express';

import { sendSuccess } from '../../shared/http/response';
import { getAuthenticatedUser } from './auth.middleware';
import {
  buildFrontendRedirect,
  consumeOAuthReturnPath,
  getGoogleOAuthIdentity,
} from './auth.oauth';
import type { AuthService } from './auth.service';
import type { SessionPrincipal } from './auth.types';
import type {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResendOtpBody,
  ResetPasswordBody,
  VerifyOtpBody,
} from './auth.validation';

export interface AuthSessionManager {
  destroy(request: Request, response: Response): Promise<void>;
  establish(request: Request, response: Response, principal: SessionPrincipal): Promise<void>;
}

export interface AuthControllerOptions {
  allowedOAuthReturnPaths: readonly string[];
  frontendUrl: string;
  issueCsrfToken(request: Request): string;
}

export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly sessions: AuthSessionManager,
    private readonly options: AuthControllerOptions,
  ) {}

  public readonly register = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.register(request.validated.body as RegisterBody);
    sendSuccess(response, {
      data: result,
      message: 'If registration can proceed, a verification code has been sent',
      statusCode: 202,
    });
  };

  public readonly login = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.login(request.validated.body as LoginBody);
    if (result.status === 'verification_required') {
      sendSuccess(response, {
        data: {
          email: result.email,
          requires_verification: result.requires_verification,
        },
        message: 'Email verification is required before sign in',
      });
      return;
    }

    await this.sessions.establish(request, response, result.principal);
    sendSuccess(response, {
      data: { user: result.user },
      message: 'Signed in successfully',
    });
  };

  public readonly verifyOtp = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.verifyRegistrationOtp(
      request.validated.body as VerifyOtpBody,
    );
    await this.sessions.establish(request, response, result.principal);
    sendSuccess(response, {
      data: { user: result.user },
      message: 'Email verified successfully',
    });
  };

  public readonly resendOtp = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.resendOtp(request.validated.body as ResendOtpBody);
    sendSuccess(response, {
      data: result,
      message: 'If the request is valid, a verification code has been sent',
      statusCode: 202,
    });
  };

  public readonly forgotPassword = async (request: Request, response: Response): Promise<void> => {
    const body = request.validated.body as ForgotPasswordBody;
    const result = await this.authService.forgotPassword(body.email);
    sendSuccess(response, {
      data: result,
      message: 'If the email is registered, a password reset code has been sent',
      statusCode: 202,
    });
  };

  public readonly resetPassword = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.resetPassword(
      request.validated.body as ResetPasswordBody,
    );
    await this.sessions.destroy(request, response);
    sendSuccess(response, {
      data: result,
      message: 'Password reset successfully',
    });
  };

  public readonly me = (request: Request, response: Response): void => {
    sendSuccess(response, {
      data: getAuthenticatedUser(request),
      message: 'Current user retrieved',
    });
  };

  public readonly csrfToken = (request: Request, response: Response): void => {
    sendSuccess(response, {
      data: { csrf_token: this.options.issueCsrfToken(request) },
      message: 'CSRF token issued',
    });
  };

  public readonly completeGoogleOAuth = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const identity = getGoogleOAuthIdentity(request);
    if (!identity) {
      response.redirect(303, buildFrontendRedirect(this.options.frontendUrl, '/login', 'failed'));
      return;
    }

    const returnPath = consumeOAuthReturnPath(
      request.session.oauthReturnTo,
      this.options.allowedOAuthReturnPaths,
    );
    delete request.session.oauthReturnTo;
    await this.sessions.establish(request, response, identity.principal);
    response.redirect(303, buildFrontendRedirect(this.options.frontendUrl, returnPath));
  };

  public readonly logout = async (request: Request, response: Response): Promise<void> => {
    await this.sessions.destroy(request, response);
    response.status(204).send();
  };
}
