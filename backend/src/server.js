import { env } from './config/env.js';
import app from './app.js';

app.listen(env.port, () => {
  console.log(`API lojaRPG rodando em http://localhost:${env.port}`);
});
