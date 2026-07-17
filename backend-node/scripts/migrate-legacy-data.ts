import { loadEnvironment } from '../src/config/env';
import { createLogger } from '../src/config/logger';

const environment = loadEnvironment();
const logger = createLogger(environment);
const dryRunRequested = process.argv.includes('--dry-run');

if (!dryRunRequested) {
  logger.error(
    'Legacy migration is not implemented and must remain dry-run-only until the data phase',
  );
  process.exitCode = 1;
} else {
  logger.info(
    'Legacy migration modules are not registered; dry run completed without reading or changing data',
  );
}
