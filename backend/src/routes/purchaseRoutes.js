import { Router } from 'express';
import * as controller from '../controllers/purchaseController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

export const purchaseRoutes = Router();

purchaseRoutes.use(authenticate);
purchaseRoutes.post('/', controller.create);
purchaseRoutes.get('/me', controller.me);
purchaseRoutes.get('/', controller.index);
