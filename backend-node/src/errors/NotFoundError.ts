import { AppError } from './AppError';

export class NotFoundError extends AppError {
  public constructor(message = 'Resource not found') {
    super(message, {
      code: 'RESOURCE_NOT_FOUND',
      isOperational: true,
      statusCode: 404,
    });
  }
}
