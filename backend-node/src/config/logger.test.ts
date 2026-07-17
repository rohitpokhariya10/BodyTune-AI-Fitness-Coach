import { Writable } from 'node:stream';

import type { DestinationStream } from 'pino';

import { createTestEnvironment } from '../tests/helpers/test-environment';
import { createLogger } from './logger';

describe('logger redaction', () => {
  it('does not serialize configured secrets or personal fields', () => {
    let output = '';
    const destination = new Writable({
      write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        output += chunk.toString('utf8');
        callback();
      },
    }) as DestinationStream;
    const logger = createLogger(createTestEnvironment({ LOG_LEVEL: 'info' }), destination);
    const sentinel = 'must-never-appear-in-logs';

    logger.info(
      {
        MONGODB_URI: sentinel,
        access_token: sentinel,
        client_secret: sentinel,
        req: {
          body: {
            email: sentinel,
            otp: sentinel,
            password: sentinel,
          },
          headers: {
            authorization: sentinel,
            cookie: sentinel,
          },
        },
        sessionId: sentinel,
      },
      'redaction test',
    );

    expect(output).not.toContain(sentinel);
    expect(output).toContain('[REDACTED]');
  });
});
