import { ROLES } from '../config/roles.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listPurchases } from '../models/purchaseModel.js';
import { checkout } from '../services/purchaseService.js';
import { ApiError } from '../utils/ApiError.js';

export async function create(req, res) {
  const result = await checkout(req.user, req.body.items, req.body.characterId);
  res.status(201).json(result);
}

export async function me(req, res) {
  const character = req.query.characterId
    ? await findCharacterById(Number(req.query.characterId))
    : await findCharacterByUserId(req.user.id);

  if (!character) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  if (character.userId !== req.user.id) {
    throw new ApiError(403, 'Voce nao pode ver compras deste personagem.');
  }

  res.json({ purchases: await listPurchases({ characterId: character.id }) });
}

export async function index(req, res) {
  if (req.user.role === ROLES.GAME_MASTER) {
    return res.json({ purchases: await listPurchases() });
  }

  const character = await findCharacterByUserId(req.user.id);
  return res.json({ purchases: character ? await listPurchases({ characterId: character.id }) : [] });
}
