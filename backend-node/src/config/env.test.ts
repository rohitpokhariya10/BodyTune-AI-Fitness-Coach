import { parseEnvironment } from './env';

describe('environment validation', () => {
  it('applies safe development defaults', () => {
    const environment = parseEnvironment({});

    expect(environment.NODE_ENV).toBe('development');
    expect(environment.PORT).toBe(9000);
    expect(environment.TRUST_PROXY).toBe(false);
    expect(environment.CORS_ORIGINS).toEqual(['http://127.0.0.1:5173', 'http://localhost:5173']);
    expect(environment.AUTH_LOCAL_ENABLED).toBe(true);
    expect(environment.AUTH_GOOGLE_ENABLED).toBe(false);
    expect(environment.COOKIE_SECURE).toBe(false);
    expect(environment.SESSION_SECRETS[0]?.length).toBeGreaterThanOrEqual(64);
  });

  it('parses a bounded production configuration', () => {
    const environment = parseEnvironment({
      AUTH_GOOGLE_ENABLED: 'true',
      AUTH_LOCAL_ENABLED: 'false',
      COOKIE_SECURE: 'true',
      CORS_ORIGINS: 'https://app.example.com',
      FRONTEND_URL: 'https://app.example.com',
      GOOGLE_CALLBACK_URL: 'https://api.example.com/api/v1/auth/google/callback',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      MONGODB_URI: 'mongodb+srv://service-account:secret@cluster.example.com/bodytune',
      NODE_ENV: 'production',
      SESSION_COOKIE_NAME: '__Host-bodytune.sid',
      SESSION_SECRETS: '3f6d8704a8cc12609cbeeb0f1e709f97509f4f9ac52e7c57d5be216f06e04967',
      TRUST_PROXY: '1',
    });

    expect(environment.TRUST_PROXY).toBe(1);
    expect(environment.CORS_ORIGINS).toEqual(['https://app.example.com']);
    expect(environment.COOKIE_SECURE).toBe(true);
    expect(environment.AUTH_GOOGLE_ENABLED).toBe(true);
  });

  it.each([
    [
      'wildcard CORS',
      {
        CORS_ORIGINS: '*',
      },
    ],
    [
      'insecure production origin',
      {
        AUTH_LOCAL_ENABLED: 'false',
        CORS_ORIGINS: 'http://app.example.com',
        MONGODB_URI: 'mongodb+srv://service:secret@cluster.example.com/bodytune',
        NODE_ENV: 'production',
      },
    ],
    [
      'unbounded production proxy trust',
      {
        AUTH_LOCAL_ENABLED: 'false',
        CORS_ORIGINS: 'https://app.example.com',
        MONGODB_URI: 'mongodb+srv://service:secret@cluster.example.com/bodytune',
        NODE_ENV: 'production',
        TRUST_PROXY: 'true',
      },
    ],
    [
      'local production database',
      {
        AUTH_LOCAL_ENABLED: 'false',
        CORS_ORIGINS: 'https://app.example.com',
        MONGODB_URI: 'mongodb://localhost:27017/bodytune',
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
      },
    ],
    [
      'ambiguous test database',
      {
        MONGODB_URI: 'mongodb://127.0.0.1:27017/bodytune',
        NODE_ENV: 'test',
      },
    ],
    [
      'oversized request limit',
      {
        REQUEST_BODY_LIMIT: '2mb',
      },
    ],
    [
      'insecure SameSite=None cookie',
      {
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      },
    ],
  ])('rejects %s', (_name, input) => {
    expect(() => parseEnvironment(input)).toThrow('Invalid environment configuration');
  });

  it('never treats the string false as true', () => {
    const environment = parseEnvironment({
      AUTH_GOOGLE_ENABLED: 'false',
      COOKIE_SECURE: 'false',
      TRUST_PROXY: 'false',
    });

    expect(environment.TRUST_PROXY).toBe(false);
    expect(environment.AUTH_GOOGLE_ENABLED).toBe(false);
    expect(environment.COOKIE_SECURE).toBe(false);
  });

  it('fails closed when production authentication secrets use placeholders', () => {
    expect(() =>
      parseEnvironment({
        AUTH_LOCAL_ENABLED: 'true',
        COOKIE_SECURE: 'true',
        CORS_ORIGINS: 'https://app.example.com',
        FRONTEND_URL: 'https://app.example.com',
        MONGODB_URI: 'mongodb+srv://service:secret@cluster.example.com/bodytune',
        NODE_ENV: 'production',
        SESSION_COOKIE_NAME: '__Host-bodytune.sid',
        SESSION_SECRETS: 'replace-this-session-secret-before-production-000000000000000000000',
        TRUST_PROXY: '1',
      }),
    ).toThrow('Invalid environment configuration');
  });
});
