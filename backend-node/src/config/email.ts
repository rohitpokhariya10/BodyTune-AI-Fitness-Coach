import nodemailer from 'nodemailer';

import { ExternalServiceError } from '../errors/ExternalServiceError';
import type { EmailGateway, OtpPurpose } from '../modules/auth/auth.types';

export interface EmailEnvironment {
  AUTH_LOCAL_ENABLED: boolean;
  SMTP_FROM?: string | undefined;
  SMTP_HOST?: string | undefined;
  SMTP_PASSWORD?: string | undefined;
  SMTP_PORT: number;
  SMTP_REQUIRE_TLS: boolean;
  SMTP_SECURE: boolean;
  SMTP_USER?: string | undefined;
}

interface SmtpConfiguration {
  from: string;
  host: string;
  password: string;
  port: number;
  requireTls: boolean;
  secure: boolean;
  user: string;
}

interface OtpCopy {
  action: string;
  subject: string;
}

const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_DNS_TIMEOUT_MS = 5_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 30_000;

const asNonEmptyString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized;
};

const resolveSmtpConfiguration = (environment: EmailEnvironment): SmtpConfiguration | undefined => {
  const from = asNonEmptyString(environment.SMTP_FROM);
  const host = asNonEmptyString(environment.SMTP_HOST);
  const password = asNonEmptyString(environment.SMTP_PASSWORD);
  const user = asNonEmptyString(environment.SMTP_USER);
  const validPort =
    Number.isInteger(environment.SMTP_PORT) &&
    environment.SMTP_PORT >= 1 &&
    environment.SMTP_PORT <= 65_535;

  if (!from || !host || !password || !user || !validPort) {
    return undefined;
  }

  return {
    from,
    host,
    password,
    port: environment.SMTP_PORT,
    requireTls: environment.SMTP_REQUIRE_TLS,
    secure: environment.SMTP_SECURE,
    user,
  };
};

const createUnavailableGateway = (cause?: unknown): EmailGateway => ({
  sendOtp(): Promise<void> {
    return Promise.reject(
      new ExternalServiceError('Email delivery is temporarily unavailable', cause),
    );
  },
});

const getOtpCopy = (purpose: OtpPurpose): OtpCopy =>
  purpose === 'register'
    ? {
        action: 'verify your BodyTune account',
        subject: 'Verify your BodyTune account',
      }
    : {
        action: 'reset your BodyTune password',
        subject: 'Reset your BodyTune password',
      };

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const expirationLabel = (minutes: number): string =>
  `${String(minutes)} ${minutes === 1 ? 'minute' : 'minutes'}`;

const createConfiguredGateway = (configuration: SmtpConfiguration): EmailGateway => {
  const transporter = nodemailer.createTransport({
    auth: {
      pass: configuration.password,
      user: configuration.user,
    },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    debug: false,
    dnsTimeout: SMTP_DNS_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    host: configuration.host,
    logger: false,
    maxConnections: 5,
    maxMessages: 100,
    pool: true,
    port: configuration.port,
    requireTLS: configuration.requireTls,
    secure: configuration.secure,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    transactionLog: false,
  });

  return {
    async sendOtp(input): Promise<void> {
      const copy = getOtpCopy(input.purpose);
      const expiresIn = expirationLabel(input.expiresInMinutes);
      const safeCode = escapeHtml(input.code);

      try {
        await transporter.sendMail({
          disableFileAccess: true,
          disableUrlAccess: true,
          from: configuration.from,
          html: `<p>Use this one-time code to ${copy.action}:</p><p><strong>${safeCode}</strong></p><p>This code expires in ${expiresIn}. Do not share it.</p><p>If you did not request this code, you can ignore this email.</p>`,
          subject: copy.subject,
          text: [
            `Use this one-time code to ${copy.action}:`,
            '',
            input.code,
            '',
            `This code expires in ${expiresIn}. Do not share it.`,
            'If you did not request this code, you can ignore this email.',
          ].join('\n'),
          to: input.to,
        });
      } catch (error) {
        throw new ExternalServiceError('Email delivery is temporarily unavailable', error);
      }
    },
  };
};

export const createEmailGateway = (environment: EmailEnvironment): EmailGateway => {
  if (!environment.AUTH_LOCAL_ENABLED) {
    return createUnavailableGateway();
  }

  const configuration = resolveSmtpConfiguration(environment);
  if (!configuration) {
    return createUnavailableGateway();
  }

  try {
    return createConfiguredGateway(configuration);
  } catch (error) {
    return createUnavailableGateway(error);
  }
};
