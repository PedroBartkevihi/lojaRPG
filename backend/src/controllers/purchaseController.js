import { ROLES } from '../config/roles.js';
import { findCharacterByUserId } from '../models/characterModel.js';
import { listPurchases } from '../models/purchaseModel.js';
import { checkout } from '../services/purchaseService.js';
import { ApiError } from '../utils/ApiError.js';

export function create(req, res) {
  const result = checkout(req.user, req.body.items);
  res.status(201).json(result);
}

export function me(req, res) {
  const character = findCharacterByUserId(req.user.id);

  if (!character) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  res.json({ purchases: listPurchases({ characterId: character.id }) });
}

export function index(req, res) {
  if (req.user.role === ROLES.GAME_MASTER) {
    return res.json({ purchases: listPurchases() });
  }

  const character = findCharacterByUserId(req.user.id);
  return res.json({ purchases: character ? listPurchases({ characterId: character.id }) : [] });
}
