import { Router } from 'express';
import * as controller from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRoutes = Router();

authRoutes.post('/register', asyncHandler(controller.register));
authRoutes.post('/login', asyncHandler(controller.login));
authRoutes.post('/logout', authenticate, controller.logout);
authRoutes.get('/me', authenticate, controller.me);
