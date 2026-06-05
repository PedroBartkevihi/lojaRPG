import { Router } from 'express';
import * as controller from '../controllers/inventoryController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const inventoryRoutes = Router();

inventoryRoutes.use(authenticate);
inventoryRoutes.get('/me', asyncHandler(controller.me));
inventoryRoutes.get('/:characterId', asyncHandler(controller.show));
