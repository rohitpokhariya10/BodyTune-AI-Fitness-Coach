import { loadEnvironment } from '../src/config/env';
import { createLogger } from '../src/config/logger';

const environment = loadEnvironment();
const logger = createLogger(environment);

logger.info(
  'No foundation seeders are registered; product catalog seeders will be added with their modules',
);
