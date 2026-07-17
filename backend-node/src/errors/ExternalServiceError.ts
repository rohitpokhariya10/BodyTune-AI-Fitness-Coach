import { AppError } from './AppError';

export class ExternalServiceError extends AppError {
  public constructor(message = 'An external service is temporarily unavailable', cause?: unknown) {
    super(message, {
      cause,
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      isOperational: true,
      statusCode: 502,
    });
  }
}
