import 'express-session';

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    oauthReturnTo?: string;
    sessionVersion?: number;
    userId?: string;
  }
}

export {};
