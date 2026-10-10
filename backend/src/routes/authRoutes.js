import { Router } from 'express';
import * as controller from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authRateLimiter, refreshRateLimiter } from '../middlewares/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRoutes = Router();

authRoutes.post('/register', authRateLimiter, asyncHandler(controller.register));
authRoutes.post('/login', authRateLimiter, asyncHandler(controller.login));
authRoutes.post('/refresh', refreshRateLimiter, asyncHandler(controller.refresh));
authRoutes.post('/logout', asyncHandler(controller.logout));
authRoutes.get('/me', authenticate, asyncHandler(controller.me));
