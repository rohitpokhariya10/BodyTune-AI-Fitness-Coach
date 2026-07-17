import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import pinoHttp, { type StdSerializedResults } from 'pino-http';

const pathWithoutQuery = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }

  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
};

export const createHttpLoggerMiddleware = (logger: Logger): RequestHandler =>
  pinoHttp({
    customLogLevel: (_request, response, error) => {
      if (error || response.statusCode >= 500) {
        return 'error';
      }

      if (response.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    },
    customProps: (request) => ({
      requestId: request.id,
    }),
    genReqId: (request) => request.requestId,
    logger,
    serializers: {
      req: (request: StdSerializedResults['req']) => ({
        id: request.id,
        method: request.method,
        path: pathWithoutQuery(request.url),
        remoteAddress: request.remoteAddress,
      }),
      res: (response: StdSerializedResults['res']) => ({
        statusCode: response.statusCode,
      }),
    },
  });
