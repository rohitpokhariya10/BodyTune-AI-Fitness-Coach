import type { RequestHandler } from 'express';

import { NotFoundError } from '../errors/NotFoundError';

export const notFoundMiddleware: RequestHandler = (_request, _response, next) => {
  next(new NotFoundError('Route not found'));
};
