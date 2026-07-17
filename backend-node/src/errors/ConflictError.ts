import { AppError } from './AppError';

export class ConflictError extends AppError {
  public constructor(message = 'The resource conflicts with existing data') {
    super(message, {
      code: 'RESOURCE_CONFLICT',
      isOperational: true,
      statusCode: 409,
    });
  }
}
