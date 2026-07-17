import type { ValidatedRequestData } from '../middlewares/validation.middleware';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      validated: ValidatedRequestData;
    }
  }
}

export {};
