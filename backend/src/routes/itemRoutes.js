import { Router } from 'express';
import * as controller from '../controllers/itemController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const itemRoutes = Router();

itemRoutes.use(authenticate);
itemRoutes.get('/', asyncHandler(controller.index));
itemRoutes.get('/:id', asyncHandler(controller.show));
itemRoutes.post('/', requireGameMaster, asyncHandler(controller.create));
itemRoutes.put('/:id', requireGameMaster, asyncHandler(controller.update));
itemRoutes.delete('/:id', requireGameMaster, asyncHandler(controller.remove));
itemRoutes.patch('/:id/reactivate', requireGameMaster, asyncHandler(controller.reactivate));
