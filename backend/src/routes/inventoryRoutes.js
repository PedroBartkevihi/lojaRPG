import { Router } from 'express';
import * as controller from '../controllers/inventoryController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

export const inventoryRoutes = Router();

inventoryRoutes.use(authenticate);
inventoryRoutes.get('/me', controller.me);
inventoryRoutes.get('/:characterId', controller.show);
