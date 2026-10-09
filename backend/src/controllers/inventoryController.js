import { ROLES } from '../config/roles.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listInventoryByCharacterId } from '../models/inventoryModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { ApiError } from '../utils/ApiError.js';
import { parse } from '../utils/validation.js';

function ensureInventoryAccess(user, character) {
  if (!character) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  if (user.role !== ROLES.GAME_MASTER && character.userId !== user.id) {
    throw new ApiError(403, 'Voce nao pode ver este inventario.');
  }
}

export async function me(req, res) {
  const character = req.query.characterId
    ? await findCharacterById(parse(characterIdSchema, req.query.characterId))
    : await findCharacterByUserId(req.user.id);
  ensureInventoryAccess(req.user, character);

  res.json({
    character,
    inventory: await listInventoryByCharacterId(character.id)
  });
}

export async function show(req, res) {
  const character = await findCharacterById(parse(characterIdSchema, req.params.characterId));
  ensureInventoryAccess(req.user, character);

  res.json({
    character,
    inventory: await listInventoryByCharacterId(character.id)
  });
}
