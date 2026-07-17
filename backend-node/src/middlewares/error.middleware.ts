import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import type { Logger } from 'pino';
import { ZodError } from 'zod';

import type { Environment } from '../config/env';
import { AppError } from '../errors/AppError';
import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';
import type { ApiErrorResponse } from '../shared/types/api-response';

interface ParserError extends SyntaxError {
  status?: number;
  type?: string;
}

interface DuplicateKeyError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

const isDuplicateKeyError = (error: unknown): error is DuplicateKeyError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 11000;

const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError(
      'Validation failed',
      error.issues.map((issue) => {
        const field = issue.path.map(String).join('.');

        return {
          code: issue.code,
          ...(field ? { field } : {}),
          message: issue.message,
        };
      }),
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return new ValidationError(
      'Database validation failed',
      Object.keys(error.errors).map((field) => ({
        field,
        message: 'Invalid value',
      })),
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return new ValidationError('Invalid resource identifier', [
      {
        field: error.path,
        message: 'Identifier is invalid',
      },
    ]);
  }

  if (isDuplicateKeyError(error)) {
    const fields = Object.keys(error.keyPattern ?? {});
    const conflict = new ConflictError('A resource with the supplied unique value already exists');
    return new AppError(conflict.message, {
      code: conflict.code,
      errors: fields.map((field) => ({
        field,
        message: 'Value must be unique',
      })),
      isOperational: true,
      statusCode: conflict.statusCode,
    });
  }

  if (error instanceof SyntaxError && (error as ParserError).type === 'entity.parse.failed') {
    return new ValidationError('Malformed JSON request body');
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error as ParserError).type === 'entity.too.large'
  ) {
    return new AppError('Request body is too large', {
      code: 'PAYLOAD_TOO_LARGE',
      isOperational: true,
      statusCode: 413,
    });
  }

  return new AppError('Internal server error', {
    cause: error,
    code: 'INTERNAL_SERVER_ERROR',
    isOperational: false,
    statusCode: 500,
  });
};

export const createErrorMiddleware = (
  environment: Environment,
  logger: Logger,
): ErrorRequestHandler => {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const normalized = normalizeError(error);
    const statusCode = normalized.isOperational ? normalized.statusCode : 500;
    const exposeDetails = normalized.isOperational || environment.NODE_ENV !== 'production';

    const logContext = {
      code: normalized.code,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      method: request.method,
      path: request.path,
      requestId: request.requestId,
      statusCode,
    };

    if (normalized.code === 'DATABASE_UNAVAILABLE' && request.path === '/ready') {
      logger.debug(logContext, 'Readiness probe failed');
    } else if (statusCode >= 500) {
      logger.error(logContext, 'Request failed');
    } else {
      logger.warn(logContext, 'Request rejected');
    }

    const payload: ApiErrorResponse = {
      success: false,
      message: exposeDetails ? normalized.message : 'Internal server error',
      code: exposeDetails ? normalized.code : 'INTERNAL_SERVER_ERROR',
      errors: exposeDetails ? normalized.errors : [],
      requestId: request.requestId,
      ...(environment.NODE_ENV === 'development' && normalized.stack
        ? { stack: normalized.stack }
        : {}),
    };

    response.status(statusCode).json(payload);
  };
};
