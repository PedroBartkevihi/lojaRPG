import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { campaignRoutes } from './routes/campaignRoutes.js';

const app = express();

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
