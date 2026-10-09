import { Router } from 'express';
import * as controller from '../controllers/catalogController.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const catalogRoutes = Router();


catalogRoutes.get('/categories', asyncHandler(controller.categoriesIndex));
catalogRoutes.post('/categories', requireGameMaster, asyncHandler(controller.categoriesCreate));
catalogRoutes.put('/categories/:id', requireGameMaster, asyncHandler(controller.categoriesUpdate));
catalogRoutes.delete('/categories/:id', requireGameMaster, asyncHandler(controller.categoriesRemove));

catalogRoutes.get('/rarities', asyncHandler(controller.raritiesIndex));
catalogRoutes.post('/rarities', requireGameMaster, asyncHandler(controller.raritiesCreate));
catalogRoutes.put('/rarities/:id', requireGameMaster, asyncHandler(controller.raritiesUpdate));
catalogRoutes.delete('/rarities/:id', requireGameMaster, asyncHandler(controller.raritiesRemove));

catalogRoutes.get('/stock-movements', requireGameMaster, asyncHandler(controller.stockMovements));
