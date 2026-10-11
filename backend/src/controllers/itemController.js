import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { createItem, findItemById, listItems, reactivateItem } from '../models/itemModel.js';
import { expectedStockSchema, itemIdSchema, itemQuerySchema, itemSchema } from '../schemas/itemSchemas.js';
import { removeItem, saveItemChanges } from '../services/itemService.js';
import { ApiError } from '../utils/ApiError.js';
import { parse, parseChanges } from '../utils/validation.js';

function parseItem(body, existing) {
  if (!existing) {
    return parse(itemSchema, body);
  }

  return {
    name: existing.name,
    category: existing.category,
    description: existing.description || '',
    price: existing.price,
    sellPrice: existing.sellPrice,
    isSellable: existing.isSellable,
    rarity: existing.rarity || 'Comum',
    stock: existing.stock,
    imageUrl: existing.imageUrl || '',
    ...parseChanges(itemSchema, body)
  };
}

export async function index(req, res) {
  const includeInactive = req.query.includeInactive === 'true' && isGameMaster(req);
  const items = await listItems({
    ...parse(itemQuerySchema, req.query),
    campaignId: req.campaign.id,
    includeInactive
  });

  res.json({ items });
}

export async function show(req, res) {
  const item = await findItemById(parse(itemIdSchema, req.params.id), {
    campaignId: req.campaign.id,
    includeInactive: isGameMaster(req)
  });

  if (!item) {
    throw new ApiError(404, 'Item não encontrado.');
  }

  res.json({ item });
}

export async function create(req, res) {
  const item = await createItem({
    ...parseItem(req.body),
    campaignId: req.campaign.id,
    createdBy: req.user.id
  });

  res.status(201).json({ item });
}

export async function update(req, res) {
  const id = parse(itemIdSchema, req.params.id);
  const existing = await findItemById(id, { campaignId: req.campaign.id, includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item não encontrado.');
  }

  if (req.body.stock !== undefined && req.body.expectedStock === undefined) {
    throw new ApiError(400, 'Informe expectedStock ao alterar o estoque. Recarregue o item e tente novamente.');
  }
  const expectedStock =
    req.body.expectedStock === undefined ? undefined : parse(expectedStockSchema, req.body.expectedStock);
  const item = await saveItemChanges(existing, parseItem(req.body, existing), req.user.id, {
    stockReason: req.body.stockReason,
    expectedStock
  });

  res.json({ item });
}

export async function remove(req, res) {
  const id = parse(itemIdSchema, req.params.id);
  const existing = await findItemById(id, { campaignId: req.campaign.id, includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item não encontrado.');
  }

  const item = await removeItem(existing, req.user.id);
  res.json({ message: 'Item removido da loja.', item });
}

export async function reactivate(req, res) {
  const id = parse(itemIdSchema, req.params.id);
  const existing = await findItemById(id, { campaignId: req.campaign.id, includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item não encontrado.');
  }

  const item = await reactivateItem(id);
  res.json({ message: 'Item reativado na loja.', item });
}
