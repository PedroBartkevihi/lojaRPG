import { Router } from 'express';
import * as controller from '../controllers/purchaseController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const purchaseRoutes = Router();

purchaseRoutes.use(authenticate);
purchaseRoutes.post('/', asyncHandler(controller.create));
purchaseRoutes.get('/me', asyncHandler(controller.me));
purchaseRoutes.get('/', asyncHandler(controller.index));
