import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export const requestIdMiddleware: RequestHandler = (request, response, next) => {
  const suppliedRequestId = request.get('x-request-id');
  const requestId =
    suppliedRequestId && requestIdPattern.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();

  request.requestId = requestId;
  request.validated = {};
  response.setHeader('x-request-id', requestId);
  next();
};
