import { AppError } from './AppError';

export class AuthenticationError extends AppError {
  public constructor(message = 'Authentication is required') {
    super(message, {
      code: 'AUTHENTICATION_REQUIRED',
      isOperational: true,
      statusCode: 401,
    });
  }
}
