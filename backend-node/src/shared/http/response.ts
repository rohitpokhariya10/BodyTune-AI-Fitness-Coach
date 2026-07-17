import type { Response } from 'express';

import type { ApiSuccessResponse } from '../types/api-response';

interface SuccessOptions<T> {
  data: T;
  message: string;
  meta?: Record<string, unknown>;
  statusCode?: number;
}

export const sendSuccess = <T>(response: Response, options: SuccessOptions<T>): void => {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    message: options.message,
    data: options.data,
    meta: {
      requestId: response.req.requestId,
      ...options.meta,
    },
  };

  response.status(options.statusCode ?? 200).json(payload);
};
