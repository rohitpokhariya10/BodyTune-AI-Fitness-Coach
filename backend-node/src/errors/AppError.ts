import type { ApiErrorDetail } from '../shared/types/api-response';

export interface AppErrorOptions {
  cause?: unknown;
  code?: string;
  errors?: ApiErrorDetail[];
  isOperational?: boolean;
  statusCode?: number;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly errors: ApiErrorDetail[];
  public readonly isOperational: boolean;
  public readonly statusCode: number;

  public constructor(message: string, options: AppErrorOptions = {}) {
    super(message);

    this.name = new.target.name;
    this.code = options.code ?? 'INTERNAL_SERVER_ERROR';
    this.errors = options.errors ?? [];
    this.isOperational = options.isOperational ?? false;
    this.statusCode = options.statusCode ?? 500;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, new.target);
  }
}
