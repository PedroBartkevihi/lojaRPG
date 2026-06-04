import { ROLES } from '../config/roles.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listInventoryByCharacterId } from '../models/inventoryModel.js';
import { ApiError } from '../utils/ApiError.js';
import * as validate from '../utils/validation.js';

function ensureInventoryAccess(user, character) {
  if (!character) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  if (user.role !== ROLES.GAME_MASTER && character.userId !== user.id) {
    throw new ApiError(403, 'Voce nao pode ver este inventario.');
  }
}

export function me(req, res) {
  const character = findCharacterByUserId(req.user.id);
  ensureInventoryAccess(req.user, character);

  res.json({
    character,
    inventory: listInventoryByCharacterId(character.id)
  });
}

export function show(req, res) {
  const character = findCharacterById(validate.integer(req.params.characterId, 'Id do personagem', { min: 1 }));
  ensureInventoryAccess(req.user, character);

  res.json({
    character,
    inventory: listInventoryByCharacterId(character.id)
  });
}
