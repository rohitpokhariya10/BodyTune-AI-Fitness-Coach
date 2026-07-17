import { AppError } from './AppError';

export class DatabaseError extends AppError {
  public constructor(message = 'The database is temporarily unavailable', cause?: unknown) {
    super(message, {
      cause,
      code: 'DATABASE_UNAVAILABLE',
      isOperational: true,
      statusCode: 503,
    });
  }
}
