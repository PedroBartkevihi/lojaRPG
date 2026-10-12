import { Router } from 'express';
import * as controller from '../controllers/sessionController.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const sessionRoutes = Router();
sessionRoutes.get('/', asyncHandler(controller.index));
sessionRoutes.post('/', requireGameMaster, asyncHandler(controller.start));
sessionRoutes.get('/:sessionId/summary', asyncHandler(controller.summary));
sessionRoutes.post('/:sessionId/close', requireGameMaster, asyncHandler(controller.close));
