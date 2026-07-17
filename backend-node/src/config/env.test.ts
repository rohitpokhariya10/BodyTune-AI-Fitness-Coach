import { parseEnvironment } from './env';

describe('environment validation', () => {
  it('applies safe development defaults', () => {
    const environment = parseEnvironment({});

    expect(environment.NODE_ENV).toBe('development');
    expect(environment.PORT).toBe(9000);
    expect(environment.TRUST_PROXY).toBe(false);
    expect(environment.CORS_ORIGINS).toEqual(['http://127.0.0.1:5173', 'http://localhost:5173']);
  });

  it('parses a bounded production configuration', () => {
    const environment = parseEnvironment({
      CORS_ORIGINS: 'https://app.example.com',
      MONGODB_URI: 'mongodb+srv://service-account:secret@cluster.example.com/bodytune',
      NODE_ENV: 'production',
      TRUST_PROXY: '1',
    });

    expect(environment.TRUST_PROXY).toBe(1);
    expect(environment.CORS_ORIGINS).toEqual(['https://app.example.com']);
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
        CORS_ORIGINS: 'http://app.example.com',
        MONGODB_URI: 'mongodb+srv://service:secret@cluster.example.com/bodytune',
        NODE_ENV: 'production',
      },
    ],
    [
      'unbounded production proxy trust',
      {
        CORS_ORIGINS: 'https://app.example.com',
        MONGODB_URI: 'mongodb+srv://service:secret@cluster.example.com/bodytune',
        NODE_ENV: 'production',
        TRUST_PROXY: 'true',
      },
    ],
    [
      'local production database',
      {
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
  ])('rejects %s', (_name, input) => {
    expect(() => parseEnvironment(input)).toThrow('Invalid environment configuration');
  });

  it('never treats the string false as true', () => {
    const environment = parseEnvironment({ TRUST_PROXY: 'false' });

    expect(environment.TRUST_PROXY).toBe(false);
  });
});
