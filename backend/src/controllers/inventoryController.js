import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listInventoryByCharacterId, listInventoryLogs } from '../models/inventoryModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { sellItemSchema, useItemSchema } from '../schemas/inventorySchemas.js';
import { sellItem, useItem } from '../services/inventoryService.js';
import { ApiError } from '../utils/ApiError.js';
import { parse } from '../utils/validation.js';

async function inventoryResponse(req, character) {
  return {
    character,
    inventory: await listInventoryByCharacterId(character.id),
    logs: await listInventoryLogs({ campaignId: req.campaign.id, characterId: character.id })
  };
}

function ensureInventoryAccess(req, character) {
  if (!character) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  if (!isGameMaster(req) && character.userId !== req.user.id) {
    throw new ApiError(403, 'Voce nao pode ver este inventario.');
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
  res.json({ logs: await listInventoryLogs({ campaignId: req.campaign.id }) });
}
