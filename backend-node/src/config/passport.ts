import type { RequestHandler } from 'express';
import passportLibrary from 'passport';
import {
  Strategy as GoogleStrategy,
  type Profile as GoogleProfile,
  type VerifyCallback,
} from 'passport-google-oauth20';

import type { Environment } from './env';
import {
  buildFrontendRedirect,
  setGoogleOAuthIdentity,
  validateOAuthReturnPath,
} from '../modules/auth/auth.oauth';
import type { AuthenticatedIdentity } from '../modules/auth/auth.types';
import type { GoogleIdentityInput } from '../modules/users/user.types';

export interface GoogleIdentityAuthenticator {
  authenticateGoogleIdentity(identity: GoogleIdentityInput): Promise<AuthenticatedIdentity>;
}

export interface GoogleOAuthAdapter {
  callback: RequestHandler;
  initialize: RequestHandler;
  passport: passportLibrary.Authenticator;
  start: RequestHandler;
}

export interface GoogleOAuthEnvironment {
  AUTH_GOOGLE_ENABLED: boolean;
  FRONTEND_URL: string;
  GOOGLE_CALLBACK_URL?: string | undefined;
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
  OAUTH_ALLOWED_RETURN_PATHS: string[];
}

const requiredGoogleConfiguration = (
  environment: GoogleOAuthEnvironment,
): {
  callbackUrl: string;
  clientId: string;
  clientSecret: string;
} => {
  const clientId = environment.GOOGLE_CLIENT_ID;
  const clientSecret = environment.GOOGLE_CLIENT_SECRET;
  const callbackUrl = environment.GOOGLE_CALLBACK_URL;

  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error(
      'Google OAuth is enabled but GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL is missing',
    );
  }

  return { callbackUrl, clientId, clientSecret };
};

export const googleProfileIdentity = (profile: GoogleProfile): GoogleIdentityInput | null => {
  const verifiedProfileEmail = profile.emails?.find((email) => email.verified)?.value;
  const verifiedJsonEmail = profile._json.email_verified === true ? profile._json.email : undefined;
  const email = verifiedProfileEmail ?? verifiedJsonEmail;

  if (!email || !profile.id.trim()) {
    return null;
  }

  return {
    displayName: profile.displayName,
    email,
    emailVerified: true,
    subject: profile.id,
  };
};

export const createGoogleVerifyCallback =
  (authenticator: GoogleIdentityAuthenticator) =>
  (
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): void => {
    const identity = googleProfileIdentity(profile);
    if (!identity) {
      done(null, false);
      return;
    }

    void authenticator
      .authenticateGoogleIdentity(identity)
      .then((authenticated) => {
        done(null, authenticated);
      })
      .catch((error: unknown) => {
        done(error);
      });
  };

const isAuthenticatedIdentity = (value: unknown): value is AuthenticatedIdentity => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const principal = Reflect.get(value, 'principal') as unknown;
  const user = Reflect.get(value, 'user') as unknown;

  return (
    typeof principal === 'object' &&
    principal !== null &&
    typeof Reflect.get(principal, 'userId') === 'string' &&
    typeof Reflect.get(principal, 'sessionVersion') === 'number' &&
    typeof user === 'object' &&
    user !== null &&
    typeof Reflect.get(user, 'id') === 'string'
  );
};

export const createGooglePassport = (
  environment: Environment | GoogleOAuthEnvironment,
  authenticator: GoogleIdentityAuthenticator,
): GoogleOAuthAdapter | null => {
  if (!environment.AUTH_GOOGLE_ENABLED) {
    return null;
  }

  const configuration = requiredGoogleConfiguration(environment);
  const passport = new passportLibrary.Passport();
  const failureRedirect = buildFrontendRedirect(environment.FRONTEND_URL, '/login', 'failed');

  passport.use(
    'google',
    new GoogleStrategy(
      {
        callbackURL: configuration.callbackUrl,
        clientID: configuration.clientId,
        clientSecret: configuration.clientSecret,
        scope: ['email', 'profile'],
        state: true,
      },
      createGoogleVerifyCallback(authenticator),
    ),
  );

  const start: RequestHandler = (request, response, next) => {
    try {
      request.session.oauthReturnTo = validateOAuthReturnPath(
        request.query.return_to,
        environment.OAUTH_ALLOWED_RETURN_PATHS,
      );
      const authenticate = passport.authenticate('google', {
        session: false,
      }) as unknown as RequestHandler;
      authenticate(request, response, next);
    } catch (error) {
      next(error);
    }
  };

  const callback: RequestHandler = (request, response, next) => {
    const authenticate = passport.authenticate(
      'google',
      { session: false },
      (error: unknown, user: Express.User | false | null | undefined): void => {
        if (error || !isAuthenticatedIdentity(user)) {
          delete request.session.oauthReturnTo;
          response.redirect(303, failureRedirect);
          return;
        }

        setGoogleOAuthIdentity(request, user);
        next();
      },
    ) as unknown as RequestHandler;
    authenticate(request, response, next);
  };

  return {
    callback,
    initialize: passport.initialize(),
    passport,
    start,
  };
};
