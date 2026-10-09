import { Router } from 'express';
import * as controller from '../controllers/rewardController.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const rewardRoutes = Router();

rewardRoutes.use(requireGameMaster);
rewardRoutes.post('/gold', asyncHandler(controller.gold));
rewardRoutes.post('/items', asyncHandler(controller.items));
