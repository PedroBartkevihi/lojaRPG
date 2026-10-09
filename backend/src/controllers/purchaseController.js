import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listPurchases } from '../models/purchaseModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { checkout } from '../services/purchaseService.js';
import { ApiError } from '../utils/ApiError.js';
import { parse } from '../utils/validation.js';

export async function create(req, res) {
  const result = await checkout(req.user, req.membership, req.body.items, req.body.characterId);
  res.status(201).json(result);
}

export async function me(req, res) {
  const character = req.query.characterId
    ? await findCharacterById(parse(characterIdSchema, req.query.characterId), req.campaign.id)
    : await findCharacterByUserId(req.user.id, req.campaign.id);

  if (!character) {
    throw new ApiError(404, 'Personagem não encontrado.');
  }

  if (character.userId !== req.user.id) {
    throw new ApiError(403, 'Você não pode ver compras deste personagem.');
  }

  res.json({ purchases: await listPurchases({ campaignId: req.campaign.id, characterId: character.id }) });
}

export async function index(req, res) {
  if (isGameMaster(req)) {
    return res.json({ purchases: await listPurchases({ campaignId: req.campaign.id }) });
  }

  const character = await findCharacterByUserId(req.user.id, req.campaign.id);
  return res.json({
    purchases: character ? await listPurchases({ campaignId: req.campaign.id, characterId: character.id }) : []
  });
}
