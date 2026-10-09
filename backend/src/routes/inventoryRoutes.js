import { Router } from 'express';
import * as controller from '../controllers/inventoryController.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const inventoryRoutes = Router();

inventoryRoutes.get('/me', asyncHandler(controller.me));
inventoryRoutes.get('/logs', requireGameMaster, asyncHandler(controller.logs));
inventoryRoutes.get('/:characterId', asyncHandler(controller.show));
inventoryRoutes.post('/:characterId/sell', asyncHandler(controller.sell));
inventoryRoutes.post('/:characterId/use', asyncHandler(controller.use));
