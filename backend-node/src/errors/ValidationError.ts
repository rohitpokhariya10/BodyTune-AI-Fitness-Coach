import type { ApiErrorDetail } from '../shared/types/api-response';

import { AppError } from './AppError';

export class ValidationError extends AppError {
  public constructor(
    message = 'Request validation failed',
    errors: ApiErrorDetail[] = [],
    statusCode = 400,
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      errors,
      isOperational: true,
      statusCode,
    });
  }
}
