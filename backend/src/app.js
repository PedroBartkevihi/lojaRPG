import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { initializeSchema } from './database/schema.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { authRoutes } from './routes/authRoutes.js';
import { characterRoutes } from './routes/characterRoutes.js';
import { catalogRoutes } from './routes/catalogRoutes.js';
import { inventoryRoutes } from './routes/inventoryRoutes.js';
import { itemRoutes } from './routes/itemRoutes.js';
import { purchaseRoutes } from './routes/purchaseRoutes.js';

initializeSchema();

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
app.use('/items', itemRoutes);
app.use('/characters', characterRoutes);
app.use('/catalog', catalogRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/purchases', purchaseRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
