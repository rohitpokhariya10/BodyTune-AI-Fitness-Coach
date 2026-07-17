import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../errors/ValidationError';

export interface ValidatedRequestData {
  body?: unknown;
  params?: unknown;
  query?: unknown;
}

export interface RequestValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

const formatField = (path: PropertyKey[]): string | undefined =>
  path.length > 0 ? path.map(String).join('.') : undefined;

export const validateRequest = (schemas: RequestValidationSchemas): RequestHandler => {
  return (request, _response, next) => {
    const validated: ValidatedRequestData = {};

    for (const location of ['body', 'params', 'query'] as const) {
      const schema = schemas[location];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(request[location]);

      if (!result.success) {
        next(
          new ValidationError(
            'Request validation failed',
            result.error.issues.map((issue) => {
              const field = formatField(issue.path);

              return {
                code: issue.code,
                ...(field ? { field } : {}),
                message: issue.message,
              };
            }),
          ),
        );
        return;
      }

      validated[location] = result.data;
    }

    request.validated = validated;
    next();
  };
};
