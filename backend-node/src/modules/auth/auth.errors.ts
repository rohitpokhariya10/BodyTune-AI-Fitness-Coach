import { AppError } from '../../errors/AppError';

export class InvalidCredentialsError extends AppError {
  public constructor() {
    super('Invalid email or password', {
      code: 'INVALID_CREDENTIALS',
      isOperational: true,
      statusCode: 401,
    });
  }
}

export class InvalidOtpError extends AppError {
  public constructor() {
    super('Invalid or expired verification code', {
      code: 'OTP_INVALID',
      isOperational: true,
      statusCode: 400,
    });
  }
}

export class OtpRequestRateLimitError extends AppError {
  public constructor() {
    super('Please wait before requesting another verification code', {
      code: 'OTP_REQUEST_RATE_LIMITED',
      isOperational: true,
      statusCode: 429,
    });
  }
}

export class GoogleIdentityError extends AppError {
  public constructor(message = 'Google authentication could not be completed') {
    super(message, {
      code: 'GOOGLE_IDENTITY_REJECTED',
      isOperational: true,
      statusCode: 401,
    });
  }
}
