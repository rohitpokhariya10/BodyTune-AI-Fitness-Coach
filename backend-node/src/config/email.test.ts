import nodemailer from 'nodemailer';

import type { AppError } from '../errors/AppError';
import { createEmailGateway, type EmailEnvironment } from './email';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

const environment: EmailEnvironment = {
  AUTH_LOCAL_ENABLED: true,
  SMTP_FROM: 'no-reply@example.com',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PASSWORD: 'smtp-secret',
  SMTP_PORT: 587,
  SMTP_REQUIRE_TLS: true,
  SMTP_SECURE: false,
  SMTP_USER: 'mailer@example.com',
};

const otpInput = {
  code: '482731',
  expiresInMinutes: 10,
  purpose: 'register' as const,
  to: 'recipient@example.com',
};

const createTransportMock = jest.mocked(nodemailer.createTransport);

const installTransport = (): jest.Mock => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-id' });
  createTransportMock.mockReturnValue({ sendMail } as never);
  return sendMail;
};

describe('email configuration', () => {
  beforeEach(() => {
    createTransportMock.mockReset();
  });

  it('creates a pooled, TLS-hardened SMTP transport with bounded timeouts', () => {
    installTransport();

    createEmailGateway(environment);

    expect(createTransportMock).toHaveBeenCalledWith({
      auth: {
        pass: 'smtp-secret',
        user: 'mailer@example.com',
      },
      connectionTimeout: 10_000,
      debug: false,
      dnsTimeout: 5_000,
      greetingTimeout: 10_000,
      host: 'smtp.example.com',
      logger: false,
      maxConnections: 5,
      maxMessages: 100,
      pool: true,
      port: 587,
      requireTLS: true,
      secure: false,
      socketTimeout: 30_000,
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      transactionLog: false,
    });
  });

  it('sends purpose-specific registration OTP text and minimal HTML', async () => {
    const sendMail = installTransport();
    const gateway = createEmailGateway(environment);

    await gateway.sendOtp(otpInput);

    expect(sendMail).toHaveBeenCalledWith({
      disableFileAccess: true,
      disableUrlAccess: true,
      from: 'no-reply@example.com',
      html: expect.stringContaining('verify your BodyTune account'),
      subject: 'Verify your BodyTune account',
      text: expect.stringContaining('verify your BodyTune account'),
      to: 'recipient@example.com',
    });

    const message = sendMail.mock.calls[0]?.[0];
    expect(message.text).toContain('482731');
    expect(message.text).toContain('10 minutes');
    expect(message.html).toContain('<strong>482731</strong>');
    expect(message.html).toContain('10 minutes');
  });

  it('uses distinct password-reset copy for forgot-password OTPs', async () => {
    const sendMail = installTransport();
    const gateway = createEmailGateway(environment);

    await gateway.sendOtp({
      ...otpInput,
      purpose: 'forgot_password',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('reset your BodyTune password'),
        subject: 'Reset your BodyTune password',
        text: expect.stringContaining('reset your BodyTune password'),
      }),
    );
    expect(sendMail.mock.calls[0]?.[0].text).not.toContain('verify your BodyTune account');
  });

  it.each([
    ['local authentication is disabled', { AUTH_LOCAL_ENABLED: false }],
    ['host is absent', { SMTP_HOST: undefined }],
    ['username is absent', { SMTP_USER: undefined }],
    ['password is absent', { SMTP_PASSWORD: undefined }],
    ['sender is absent', { SMTP_FROM: undefined }],
    ['port is invalid', { SMTP_PORT: 0 }],
  ])('fails closed when %s', async (_label, override) => {
    const gateway = createEmailGateway({ ...environment, ...override });

    await expect(gateway.sendOtp(otpInput)).rejects.toMatchObject<Partial<AppError>>({
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      isOperational: true,
      message: 'Email delivery is temporarily unavailable',
      statusCode: 502,
    });
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('maps SMTP delivery failures to a safe operational error', async () => {
    const transportFailure = new Error('provider response containing internal detail');
    const sendMail = jest.fn().mockRejectedValue(transportFailure);
    createTransportMock.mockReturnValue({ sendMail } as never);
    const gateway = createEmailGateway(environment);

    let thrown: unknown;
    try {
      await gateway.sendOtp(otpInput);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject<Partial<AppError>>({
      cause: transportFailure,
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      isOperational: true,
      message: 'Email delivery is temporarily unavailable',
      statusCode: 502,
    });
    expect((thrown as Error).message).not.toContain(otpInput.to);
    expect((thrown as Error).message).not.toContain(otpInput.code);
  });

  it('fails closed if transport construction throws', async () => {
    createTransportMock.mockImplementation(() => {
      throw new Error('transport initialization detail');
    });

    const gateway = createEmailGateway(environment);

    await expect(gateway.sendOtp(otpInput)).rejects.toMatchObject<Partial<AppError>>({
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      message: 'Email delivery is temporarily unavailable',
      statusCode: 502,
    });
  });
});
