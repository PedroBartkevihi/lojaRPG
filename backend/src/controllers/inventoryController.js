import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listInventoryByCharacterId, listInventoryLogs } from '../models/inventoryModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { sellItemSchema, useItemSchema } from '../schemas/inventorySchemas.js';
import { sellItem, useItem } from '../services/inventoryService.js';
import { ApiError } from '../utils/ApiError.js';
import { historyQuerySchema } from '../utils/historyPagination.js';
import { parse } from '../utils/validation.js';
import { transferSchema } from '../schemas/transferSchemas.js';
import { transfer } from '../services/transferService.js';
import { listGoldAuditLogs } from '../models/goldAuditModel.js';

async function inventoryResponse(req, character) {
  const page = req.query.includeLogs === 'false' ? null : await listInventoryLogs({
    campaignId: req.campaign.id, characterId: character.id, ...parse(historyQuerySchema, req.query)
  });
  return {
    character,
    inventory: await listInventoryByCharacterId(character.id),
    logs: page?.entries || [],
    logsPagination: page?.pagination || null
  };
}

function ensureInventoryAccess(req, character) {
  if (!character) {
    throw new ApiError(404, 'Personagem não encontrado.');
  }

  if (!isGameMaster(req) && character.userId !== req.user.id) {
    throw new ApiError(403, 'Você não pode ver este inventário.');
  }
}

export async function me(req, res) {
  const character = req.query.characterId
    ? await findCharacterById(parse(characterIdSchema, req.query.characterId), req.campaign.id)
    : await findCharacterByUserId(req.user.id, req.campaign.id);
  ensureInventoryAccess(req, character);

  res.json(await inventoryResponse(req, character));
}

export async function show(req, res) {
  const character = await findCharacterById(parse(characterIdSchema, req.params.characterId), req.campaign.id);
  ensureInventoryAccess(req, character);

  res.json(await inventoryResponse(req, character));
}

export async function sell(req, res) {
  const { itemId, quantity } = parse(sellItemSchema, req.body);

  res.json(
    await sellItem({
      user: req.user,
      campaignId: req.campaign.id,
      characterId: parse(characterIdSchema, req.params.characterId),
      itemId,
      quantity
    })
  );
}

export async function use(req, res) {
  const { itemId, quantity, reason } = parse(useItemSchema, req.body);

  res.json(
    await useItem({
      user: req.user,
      campaignId: req.campaign.id,
      characterId: parse(characterIdSchema, req.params.characterId),
      itemId,
      quantity,
      reason
    })
  );
}

export async function logs(req, res) {
  const page = await listInventoryLogs({ campaignId: req.campaign.id, ...parse(historyQuerySchema, req.query) });
  res.json({ logs: page.entries, pagination: page.pagination });
}

export async function characterLogs(req, res) {
  const character = await findCharacterById(parse(characterIdSchema, req.params.characterId), req.campaign.id);
  ensureInventoryAccess(req, character);
  const page = await listInventoryLogs({ campaignId: req.campaign.id, characterId: character.id, ...parse(historyQuerySchema, req.query) });
  res.json({ logs: page.entries, pagination: page.pagination });
}

export async function give(req, res) {
  res.json(await transfer({ user: req.user, campaignId: req.campaign.id,
    characterId: parse(characterIdSchema, req.params.characterId), data: parse(transferSchema, req.body) }));
}

export async function characterGoldLogs(req, res) {
  const character = await findCharacterById(parse(characterIdSchema, req.params.characterId), req.campaign.id);
  ensureInventoryAccess(req, character);
  const page = await listGoldAuditLogs({ campaignId: req.campaign.id, characterId: character.id, ...parse(historyQuerySchema, req.query) });
  res.json({ logs: page.entries, pagination: page.pagination });
}
