import pino, { type DestinationStream, type LoggerOptions } from 'pino';

import type { Environment } from './env';

const redactPaths = [
  'authorization',
  'access_token',
  'client_secret',
  'cookie',
  'csrfToken',
  'email',
  'MONGODB_URI',
  'mongodbUri',
  'mongodb_uri',
  'otp',
  'otp_code',
  'otpDigest',
  'otpPepper',
  'password',
  'passwordHash',
  'password_hash',
  'refresh_token',
  'req.body.email',
  'req.body.otp',
  'req.body.otp_code',
  'req.body.new_password',
  'req.body.password',
  'req.body.password_hash',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  'session',
  'sessionId',
  'sessionSecret',
  'sessionSecrets',
  'uri',
  '*.access_token',
  '*.client_secret',
  '*.email',
  '*.id_token',
  '*.otp',
  '*.otp_code',
  '*.password',
  '*.passwordHash',
  '*.password_hash',
  '*.refresh_token',
  '*.sessionId',
];

export const createLogger = (
  environment: Environment,
  destination?: DestinationStream,
): pino.Logger => {
  const options: LoggerOptions = {
    base: {
      environment: environment.NODE_ENV,
      service: 'bodytune-api',
    },
    level: environment.LOG_LEVEL,
    redact: {
      censor: '[REDACTED]',
      paths: redactPaths,
    },
    ...(environment.NODE_ENV === 'development' && !destination
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
            },
          },
        }
      : {}),
  };

  return destination ? pino(options, destination) : pino(options);
};
