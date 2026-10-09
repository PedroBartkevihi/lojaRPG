import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { campaignRoutes } from './routes/campaignRoutes.js';

const app = express();

app.set('trust proxy', env.trustProxy);

// Nas primeiras requisicoes vindas de proxy, registra quantos enderecos chegam
// no X-Forwarded-For (sem os IPs). Sem um cabecalho mandado pelo proprio
// cliente, esse e o numero de proxies, que deve ser o valor de TRUST_PROXY.
let forwardedForLogs = 0;

app.use((req, _res, next) => {
  const forwardedFor = req.get('x-forwarded-for');

  if (forwardedFor && forwardedForLogs < 5 && env.nodeEnv !== 'test') {
    forwardedForLogs += 1;
    console.log(
      `X-Forwarded-For com ${forwardedFor.split(',').length} endereco(s) em ${req.method} ${req.path}; TRUST_PROXY=${env.trustProxy}.`
    );
  }

  next();
});

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origem nao permitida pelo CORS.'));
    }
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/campaigns', campaignRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
