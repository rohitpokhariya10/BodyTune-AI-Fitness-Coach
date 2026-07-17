import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const integerFromString = (minimum: number, maximum: number): z.ZodNumber =>
  z.coerce.number().int().min(minimum).max(maximum);

const booleanFromString = (
  defaultValue: boolean,
): z.ZodEffects<z.ZodDefault<z.ZodEnum<['true', 'false']>>, boolean> =>
  z
    .enum(['true', 'false'])
    .default(defaultValue ? 'true' : 'false')
    .transform((value) => value === 'true');

const optionalTrimmedString = (
  minimumLength = 1,
): z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown> =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(minimumLength).optional(),
  );

const exactUrlSchema = (message: string): z.ZodEffects<z.ZodString, string, string> =>
  z
    .string()
    .url(message)
    .refine((value) => {
      const url = new URL(value);
      return url.username === '' && url.password === '' && url.hash === '';
    }, message);

const trustProxySchema = z
  .string()
  .default('false')
  .transform((value, context): boolean | number | string => {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    if (/^\d+$/.test(normalized)) {
      return Number(normalized);
    }

    if (['loopback', 'linklocal', 'uniquelocal'].includes(normalized)) {
      return normalized;
    }

    context.addIssue({
      code: 'custom',
      message: 'TRUST_PROXY must be true, false, a hop count, loopback, linklocal, or uniquelocal',
    });

    return z.NEVER;
  });

const corsOriginsSchema = z
  .string()
  .default('http://127.0.0.1:5173,http://localhost:5173')
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .refine((origins) => origins.length > 0, 'At least one CORS origin is required')
  .refine(
    (origins) => new Set(origins).size === origins.length,
    'CORS origins must not contain duplicates',
  )
  .refine((origins) => !origins.includes('*'), 'Wildcard CORS origins are not allowed')
  .refine(
    (origins) =>
      origins.every((origin) => {
        try {
          const url = new URL(origin);
          return url.origin === origin && ['http:', 'https:'].includes(url.protocol);
        } catch {
          return false;
        }
      }),
    'Every CORS origin must be an exact HTTP or HTTPS origin',
  );

const sessionSecretsSchema = z
  .string()
  .default('development-only-session-secret-change-before-production-0000000000000001')
  .transform((value) =>
    value
      .split(',')
      .map((secret) => secret.trim())
      .filter(Boolean),
  )
  .refine(
    (secrets) => secrets.length > 0 && secrets.length <= 4,
    'Provide between one and four session secrets',
  )
  .refine(
    (secrets) => secrets.every((secret) => secret.length >= 64),
    'Every session secret must contain at least 64 characters',
  )
  .refine(
    (secrets) => new Set(secrets).size === secrets.length,
    'Session secrets must not contain duplicates',
  );

const allowedReturnPathsSchema = z
  .string()
  .default('/dashboard,/admin')
  .transform((value) =>
    value
      .split(',')
      .map((path) => path.trim())
      .filter(Boolean),
  )
  .refine(
    (paths) => paths.length > 0 && paths.length <= 10,
    'Provide between one and ten OAuth return paths',
  )
  .refine(
    (paths) => paths.every((path) => /^\/(?!\/)[A-Za-z0-9/_-]*$/.test(path)),
    'OAuth return paths must be absolute application paths without query strings',
  )
  .refine(
    (paths) => new Set(paths).size === paths.length,
    'OAuth return paths must not contain duplicates',
  );

const bodySizeInBytes = (value: string): number => {
  const match = /^(\d+)(b|kb|mb)$/i.exec(value);

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const multiplier = unit === 'mb' ? 1_048_576 : unit === 'kb' ? 1_024 : 1;

  return amount * multiplier;
};

const databaseNameFromUri = (uri: string): string => {
  const withoutQuery = uri.split('?')[0] ?? '';
  const segments = withoutQuery.split('/');
  return segments.at(-1) ?? '';
};

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: integerFromString(1, 65_535).default(9000),
    MONGODB_URI: z
      .string()
      .min(1)
      .refine(
        (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        'MONGODB_URI must use the mongodb or mongodb+srv protocol',
      )
      .default('mongodb://127.0.0.1:27017/bodytune'),
    MONGODB_CONNECT_MAX_ATTEMPTS: integerFromString(1, 20).default(5),
    MONGODB_CONNECT_RETRY_DELAY_MS: integerFromString(100, 60_000).default(2_000),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: integerFromString(500, 60_000).default(5_000),
    MONGODB_MAX_POOL_SIZE: integerFromString(1, 100).default(10),
    CORS_ORIGINS: corsOriginsSchema,
    TRUST_PROXY: trustProxySchema,
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    REQUEST_BODY_LIMIT: z
      .string()
      .regex(/^\d+(b|kb|mb)$/i, 'REQUEST_BODY_LIMIT must use b, kb, or mb units')
      .default('100kb'),
    GLOBAL_RATE_LIMIT_WINDOW_MS: integerFromString(1_000, 86_400_000).default(900_000),
    GLOBAL_RATE_LIMIT_MAX: integerFromString(1, 100_000).default(300),
    AUTH_RATE_LIMIT_WINDOW_MS: integerFromString(60_000, 86_400_000).default(900_000),
    AUTH_RATE_LIMIT_MAX: integerFromString(1, 1_000).default(20),
    OTP_RATE_LIMIT_MAX: integerFromString(1, 100).default(5),
    SHUTDOWN_TIMEOUT_MS: integerFromString(1_000, 60_000).default(10_000),
    API_DOCS_ENABLED: booleanFromString(true),
    AUTH_LOCAL_ENABLED: booleanFromString(true),
    AUTH_GOOGLE_ENABLED: booleanFromString(false),
    SESSION_SECRETS: sessionSecretsSchema,
    SESSION_COOKIE_NAME: z.string().trim().min(1).max(128).default('bodytune.sid'),
    SESSION_TTL_SECONDS: integerFromString(300, 2_592_000).default(604_800),
    COOKIE_SECURE: booleanFromString(false),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    OTP_PEPPER: z
      .string()
      .min(32)
      .default('development-only-otp-pepper-change-before-production-00000001'),
    OTP_TTL_SECONDS: integerFromString(120, 1_800).default(600),
    OTP_RESEND_COOLDOWN_SECONDS: integerFromString(30, 600).default(60),
    OTP_MAX_ATTEMPTS: integerFromString(3, 10).default(5),
    SMTP_HOST: optionalTrimmedString(),
    SMTP_PORT: integerFromString(1, 65_535).default(587),
    SMTP_SECURE: booleanFromString(false),
    SMTP_REQUIRE_TLS: booleanFromString(true),
    SMTP_USER: optionalTrimmedString(),
    SMTP_PASSWORD: optionalTrimmedString(),
    SMTP_FROM: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().trim().email().optional(),
    ),
    GOOGLE_CLIENT_ID: optionalTrimmedString(),
    GOOGLE_CLIENT_SECRET: optionalTrimmedString(),
    GOOGLE_CALLBACK_URL: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      exactUrlSchema('GOOGLE_CALLBACK_URL must be an absolute URL').optional(),
    ),
    FRONTEND_URL: exactUrlSchema('FRONTEND_URL must be an absolute URL').default(
      'http://localhost:5173',
    ),
    OAUTH_ALLOWED_RETURN_PATHS: allowedReturnPathsSchema,
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === 'production' &&
      value.CORS_ORIGINS.some((origin) => origin.startsWith('http://'))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Production CORS origins must use HTTPS',
        path: ['CORS_ORIGINS'],
      });
    }

    if (value.NODE_ENV === 'production' && value.TRUST_PROXY === true) {
      context.addIssue({
        code: 'custom',
        message: 'Production TRUST_PROXY must be a bounded hop count or trusted range, not true',
        path: ['TRUST_PROXY'],
      });
    }

    if (
      value.NODE_ENV === 'production' &&
      /mongodb(\+srv)?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(value.MONGODB_URI)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Production MONGODB_URI must not use the local development database',
        path: ['MONGODB_URI'],
      });
    }

    if (value.NODE_ENV === 'test' && !/test/i.test(databaseNameFromUri(value.MONGODB_URI))) {
      context.addIssue({
        code: 'custom',
        message: 'Test MONGODB_URI database name must clearly contain test',
        path: ['MONGODB_URI'],
      });
    }

    if (bodySizeInBytes(value.REQUEST_BODY_LIMIT) > 1_048_576) {
      context.addIssue({
        code: 'custom',
        message: 'REQUEST_BODY_LIMIT must not exceed 1mb',
        path: ['REQUEST_BODY_LIMIT'],
      });
    }

    if (value.COOKIE_SAME_SITE === 'none' && !value.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        message: 'COOKIE_SAME_SITE=none requires COOKIE_SECURE=true',
        path: ['COOKIE_SECURE'],
      });
    }

    if (value.NODE_ENV === 'production') {
      if (!value.AUTH_LOCAL_ENABLED && !value.AUTH_GOOGLE_ENABLED) {
        context.addIssue({
          code: 'custom',
          message: 'At least one production authentication provider must be enabled',
          path: ['AUTH_LOCAL_ENABLED'],
        });
      }

      if (!value.COOKIE_SECURE) {
        context.addIssue({
          code: 'custom',
          message: 'Production session cookies must be secure',
          path: ['COOKIE_SECURE'],
        });
      }

      if (!value.SESSION_COOKIE_NAME.startsWith('__Host-')) {
        context.addIssue({
          code: 'custom',
          message: 'Production session cookie name must use the __Host- prefix',
          path: ['SESSION_COOKIE_NAME'],
        });
      }

      if (
        value.SESSION_SECRETS.some((secret) => /development|replace|example|change/i.test(secret))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Production session secrets must not use example values',
          path: ['SESSION_SECRETS'],
        });
      }

      if (value.AUTH_LOCAL_ENABLED) {
        if (/development|replace|example|change/i.test(value.OTP_PEPPER)) {
          context.addIssue({
            code: 'custom',
            message: 'Production OTP pepper must not use an example value',
            path: ['OTP_PEPPER'],
          });
        }

        for (const field of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const) {
          if (!value[field]) {
            context.addIssue({
              code: 'custom',
              message: field + ' is required when local authentication is enabled in production',
              path: [field],
            });
          }
        }
      }

      if (value.AUTH_GOOGLE_ENABLED) {
        for (const field of [
          'GOOGLE_CLIENT_ID',
          'GOOGLE_CLIENT_SECRET',
          'GOOGLE_CALLBACK_URL',
        ] as const) {
          if (!value[field]) {
            context.addIssue({
              code: 'custom',
              message: field + ' is required when Google authentication is enabled',
              path: [field],
            });
          }
        }
      }

      if (!value.FRONTEND_URL.startsWith('https://')) {
        context.addIssue({
          code: 'custom',
          message: 'Production FRONTEND_URL must use HTTPS',
          path: ['FRONTEND_URL'],
        });
      }

      if (value.GOOGLE_CALLBACK_URL && !value.GOOGLE_CALLBACK_URL.startsWith('https://')) {
        context.addIssue({
          code: 'custom',
          message: 'Production GOOGLE_CALLBACK_URL must use HTTPS',
          path: ['GOOGLE_CALLBACK_URL'],
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (
  input: NodeJS.ProcessEnv | Record<string, string | undefined>,
): Environment => {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    const reasons = result.error.issues
      .map((issue) => issue.path.join('.') + ': ' + issue.message)
      .join('; ');

    throw new Error('Invalid environment configuration: ' + reasons);
  }

  return result.data;
};

export const loadEnvironment = (): Environment => {
  loadDotenv();
  return parseEnvironment(process.env);
};
