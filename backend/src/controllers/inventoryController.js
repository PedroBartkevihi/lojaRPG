import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listInventoryByCharacterId } from '../models/inventoryModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { ApiError } from '../utils/ApiError.js';
import { parse } from '../utils/validation.js';

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

  res.json({
    character,
    inventory: await listInventoryByCharacterId(character.id)
  });
}

export async function show(req, res) {
  const character = await findCharacterById(parse(characterIdSchema, req.params.characterId), req.campaign.id);
  ensureInventoryAccess(req, character);

  res.json({
    character,
    inventory: await listInventoryByCharacterId(character.id)
  });
}
