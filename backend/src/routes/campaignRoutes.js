import { Router } from 'express';
import * as controller from '../controllers/campaignController.js';
import { requireCopperUnit } from '../middlewares/currencyMiddleware.js';
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
import { rewardRoutes } from './rewardRoutes.js';
import { shopRoutes } from './shopRoutes.js';
import { sessionRoutes } from './sessionRoutes.js';
import { uploadRoutes } from './uploadRoutes.js';

export const campaignRoutes = Router();

campaignRoutes.use(authenticate);
campaignRoutes.get('/', asyncHandler(controller.index));
campaignRoutes.post('/', asyncHandler(controller.create));
campaignRoutes.post('/join', inviteRateLimiter, asyncHandler(controller.join));

// Tudo abaixo de /campaigns/:campaignId exige participar da mesa.
campaignRoutes.use('/:campaignId', asyncHandler(loadCampaign));
campaignRoutes.use(requireCopperUnit);
campaignRoutes.get('/:campaignId', asyncHandler(controller.show));
campaignRoutes.patch('/:campaignId/shop', requireGameMaster, asyncHandler(controller.setShopState));
campaignRoutes.delete('/:campaignId', requireGameMaster, asyncHandler(controller.remove));
campaignRoutes.post('/:campaignId/invite-code', requireGameMaster, asyncHandler(controller.newInviteCode));
campaignRoutes.delete('/:campaignId/members/:userId', asyncHandler(controller.removeMemberAction));
campaignRoutes.use('/:campaignId/items', itemRoutes);
campaignRoutes.use('/:campaignId/characters', characterRoutes);
campaignRoutes.use('/:campaignId/catalog', catalogRoutes);
campaignRoutes.use('/:campaignId/inventory', inventoryRoutes);
campaignRoutes.use('/:campaignId/purchases', purchaseRoutes);
campaignRoutes.use('/:campaignId/rewards', rewardRoutes);
campaignRoutes.use('/:campaignId/shops', shopRoutes);
campaignRoutes.use('/:campaignId/sessions', sessionRoutes);
campaignRoutes.use('/:campaignId/uploads', uploadRoutes);
