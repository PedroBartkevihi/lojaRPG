import { Router } from 'express';
import * as controller from '../controllers/campaignController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { loadCampaign } from '../middlewares/campaignMiddleware.js';
import { inviteRateLimiter } from '../middlewares/rateLimiters.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { catalogRoutes } from './catalogRoutes.js';
import { characterRoutes } from './characterRoutes.js';
import { inventoryRoutes } from './inventoryRoutes.js';
import { itemRoutes } from './itemRoutes.js';
import { purchaseRoutes } from './purchaseRoutes.js';

export const campaignRoutes = Router();

campaignRoutes.use(authenticate);
campaignRoutes.get('/', asyncHandler(controller.index));
campaignRoutes.post('/', asyncHandler(controller.create));
campaignRoutes.post('/join', inviteRateLimiter, asyncHandler(controller.join));

// Tudo abaixo de /campaigns/:campaignId exige participar da mesa.
campaignRoutes.use('/:campaignId', asyncHandler(loadCampaign));
campaignRoutes.get('/:campaignId', asyncHandler(controller.show));
campaignRoutes.delete('/:campaignId', requireGameMaster, asyncHandler(controller.remove));
campaignRoutes.post('/:campaignId/invite-code', requireGameMaster, asyncHandler(controller.newInviteCode));
campaignRoutes.delete('/:campaignId/members/:userId', asyncHandler(controller.removeMemberAction));
campaignRoutes.use('/:campaignId/items', itemRoutes);
campaignRoutes.use('/:campaignId/characters', characterRoutes);
campaignRoutes.use('/:campaignId/catalog', catalogRoutes);
campaignRoutes.use('/:campaignId/inventory', inventoryRoutes);
campaignRoutes.use('/:campaignId/purchases', purchaseRoutes);
