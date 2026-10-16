import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { httpLogger } from './config/logger.js';
import { clientErrorRoute } from './routes/clientErrorRoute.js';
import { getPrisma } from './database/connection.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { campaignRoutes } from './routes/campaignRoutes.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

app.set('trust proxy', env.trustProxy);
app.use(httpLogger);

// Nas primeiras requisicoes vindas de proxy, registra quantos enderecos chegam
// no X-Forwarded-For (sem os IPs). Sem um cabecalho mandado pelo proprio
// cliente, esse e o numero de proxies, que deve ser o valor de TRUST_PROXY.
let forwardedForLogs = 0;

app.use((req, _res, next) => {
  const forwardedFor = req.get('x-forwarded-for');

  if (forwardedFor && forwardedForLogs < 5 && env.nodeEnv !== 'test') {
    forwardedForLogs += 1;
    req.log.info(
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

      // 403 e nao 500: a origem e recusada de proposito, nao e erro da API.
      return callback(new ApiError(403, 'Origem não permitida pelo CORS.'));
    },
    // Deixa o site mandar e receber o cookie do refresh token (modo cookie).
    // A lista de origens acima continua sendo a unica liberada.
    credentials: true,
    // O front le o id da requisicao para mandar junto num relato de erro.
    exposedHeaders: ['X-Request-Id']
  })
);
app.use(express.json());

// O /health so diz que o processo responde, e e o que o Render usa: um banco
// lento ali faria o Render reiniciar uma API saudavel. O /ready consulta o
// banco e serve para o monitor de disponibilidade.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const READY_TIMEOUT_MS = 5000;

app.get('/ready', async (req, res) => {
  let timer;

  try {
    await Promise.race([
      getPrisma().$queryRaw`SELECT 1`,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Tempo esgotado ao consultar o banco.')), READY_TIMEOUT_MS);
      })
    ]);
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    req.log.warn(`/ready sem banco: ${error.message.split('\n')[0]}`);
    res.status(503).json({ status: 'indisponivel', database: 'erro' });
  } finally {
    clearTimeout(timer);
  }
});

app.use('/auth', authRoutes);
app.use('/client-errors', clientErrorRoute);
app.use('/campaigns', campaignRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
