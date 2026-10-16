import { Router } from 'express';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import {
  approveItemRequestSchema,
  itemRequestIdSchema,
  itemRequestSchema,
  rejectItemRequestSchema
} from '../schemas/itemRequestSchemas.js';
import {
  approveItemRequest,
  cancelItemRequest,
  createItemRequest,
  listItemRequests,
  rejectItemRequest
} from '../services/itemRequestService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parse } from '../utils/validation.js';

// Encomendas ao Mestre: o jogador pede um item fora do catalogo e o Mestre
// aprova (cobrando e entregando) ou recusa.
export const itemRequestRoutes = Router();

itemRequestRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ requests: await listItemRequests(req) });
}));

itemRequestRoutes.post('/', asyncHandler(async (req, res) => {
  const data = parse(itemRequestSchema, req.body);
  res.status(201).json({ request: await createItemRequest({ ...data, user: req.user, campaignId: req.campaign.id }) });
}));

itemRequestRoutes.post('/:requestId/cancel', asyncHandler(async (req, res) => {
  const requestId = parse(itemRequestIdSchema, req.params.requestId);
  res.json({ request: await cancelItemRequest({ user: req.user, campaignId: req.campaign.id, requestId }) });
}));

itemRequestRoutes.post('/:requestId/reject', requireGameMaster, asyncHandler(async (req, res) => {
  const requestId = parse(itemRequestIdSchema, req.params.requestId);
  const { note } = parse(rejectItemRequestSchema, req.body);
  res.json({ request: await rejectItemRequest({ campaignId: req.campaign.id, requestId, note }) });
}));

itemRequestRoutes.post('/:requestId/approve', requireGameMaster, asyncHandler(async (req, res) => {
  const requestId = parse(itemRequestIdSchema, req.params.requestId);
  const data = parse(approveItemRequestSchema, req.body);
  const request = await approveItemRequest({ ...data, actorUserId: req.user.id, campaignId: req.campaign.id, requestId });
  res.json({ message: `Encomenda entregue a ${request.characterName}.`, request });
}));
