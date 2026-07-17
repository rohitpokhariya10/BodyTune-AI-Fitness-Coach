import { AppError } from './AppError';

export class AuthorizationError extends AppError {
  public constructor(message = 'You are not authorized to perform this action') {
    super(message, {
      code: 'AUTHORIZATION_DENIED',
      isOperational: true,
      statusCode: 403,
    });
  }
}
