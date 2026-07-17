import { AppError } from './AppError';

export class RateLimitError extends AppError {
  public constructor(message = 'Too many requests. Please try again later') {
    super(message, {
      code: 'RATE_LIMIT_EXCEEDED',
      isOperational: true,
      statusCode: 429,
    });
  }
}
