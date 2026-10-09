import { Router } from 'express';
import * as controller from '../controllers/characterController.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const characterRoutes = Router();

characterRoutes.get('/', requireGameMaster, asyncHandler(controller.index));
characterRoutes.get('/me', asyncHandler(controller.me));
characterRoutes.get('/gold-audit', requireGameMaster, asyncHandler(controller.goldAudit));
characterRoutes.post('/', asyncHandler(controller.create));
characterRoutes.put('/:id', asyncHandler(controller.update));
characterRoutes.patch('/:id/gold', requireGameMaster, asyncHandler(controller.changeGold));
