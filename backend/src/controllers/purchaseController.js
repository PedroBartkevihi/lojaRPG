import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { listPurchases } from '../models/purchaseModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { checkout } from '../services/purchaseService.js';
import { ApiError } from '../utils/ApiError.js';
import { historyQuerySchema } from '../utils/historyPagination.js';
import { parse } from '../utils/validation.js';

export async function create(req, res) {
  const result = await checkout(req.user, req.membership, req.body.items, req.body.characterId, req.body.idempotencyKey, req.body.expectedTotal);
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

  const page = await listPurchases({ campaignId: req.campaign.id, characterId: character.id, ...parse(historyQuerySchema, req.query) });
  res.json({ purchases: page.entries, pagination: page.pagination });
}

export async function index(req, res) {
  const pagination = parse(historyQuerySchema, req.query);
  if (isGameMaster(req)) {
    const page = await listPurchases({ campaignId: req.campaign.id, ...pagination });
    return res.json({ purchases: page.entries, pagination: page.pagination });
  }

  const character = await findCharacterByUserId(req.user.id, req.campaign.id);
  const page = character ? await listPurchases({ campaignId: req.campaign.id, characterId: character.id, ...pagination }) :
    { entries: [], pagination: { limit: pagination.limit, hasMore: false, nextCursor: null } };
  return res.json({ purchases: page.entries, pagination: page.pagination });
}
