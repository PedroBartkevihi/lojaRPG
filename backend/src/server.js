import { env } from './config/env.js';
import { logger } from './config/logger.js';
import app from './app.js';
import { startMaintenance } from './services/maintenanceService.js';

app.listen(env.port, () => {
  logger.info(`API lojaRPG rodando em http://localhost:${env.port}`);
  startMaintenance(logger);
});
