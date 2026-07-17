import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const integerFromString = (minimum: number, maximum: number): z.ZodNumber =>
  z.coerce.number().int().min(minimum).max(maximum);

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
    SHUTDOWN_TIMEOUT_MS: integerFromString(1_000, 60_000).default(10_000),
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
