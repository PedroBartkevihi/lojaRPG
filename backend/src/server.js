import { env } from './config/env.js';
import app from './app.js';
import { startMaintenance } from './services/maintenanceService.js';

app.listen(env.port, () => {
  console.log(`API lojaRPG rodando em http://localhost:${env.port}`);
  startMaintenance();
});
