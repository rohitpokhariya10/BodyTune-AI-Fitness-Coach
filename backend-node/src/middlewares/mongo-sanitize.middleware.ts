import type { RequestHandler } from 'express';

import { ValidationError } from '../errors/ValidationError';

const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
const maximumDepth = 20;

const inspectValue = (value: unknown, path: string, depth: number): void => {
  if (depth > maximumDepth) {
    throw new ValidationError('Request nesting is too deep', [
      {
        field: path,
        message: 'Request nesting must not exceed ' + String(maximumDepth) + ' levels',
      },
    ]);
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      inspectValue(item, path + '[' + String(index) + ']', depth + 1);
    });
    return;
  }

  if (value === null || typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key.includes('$') || key.includes('.') || forbiddenKeys.has(key)) {
      throw new ValidationError('Unsafe request key rejected', [
        {
          field: path + '.' + key,
          message: 'MongoDB operator and prototype keys are not allowed',
        },
      ]);
    }

    inspectValue(child, path + '.' + key, depth + 1);
  }
};

export const rejectUnsafeMongoInput: RequestHandler = (request, _response, next) => {
  inspectValue(request.body, 'body', 0);
  inspectValue(request.params, 'params', 0);
  inspectValue(request.query, 'query', 0);
  next();
};
