import { createItem, findItemById, listItems, reactivateItem } from '../models/itemModel.js';
import { itemIdSchema, itemSchema } from '../schemas/itemSchemas.js';
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
    rarity: existing.rarity || 'Comum',
    stock: existing.stock,
    imageUrl: existing.imageUrl || '',
    ...parseChanges(itemSchema, body)
  };
}

export async function index(req, res) {
  const includeInactive = req.query.includeInactive === 'true' && req.user.role === 'MESTRE';
  const items = await listItems({
    search: req.query.search?.trim(),
    category: req.query.category?.trim(),
    rarity: req.query.rarity?.trim(),
    status: req.query.status?.trim(),
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    includeInactive
  });

  res.json({ items });
}

export async function show(req, res) {
  const item = await findItemById(parse(itemIdSchema, req.params.id), {
    includeInactive: req.user.role === 'MESTRE'
  });

  if (!item) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  res.json({ item });
}

export async function create(req, res) {
  const item = await createItem({
    ...parseItem(req.body),
    createdBy: req.user.id
  });

  res.status(201).json({ item });
}

export async function update(req, res) {
  const id = parse(itemIdSchema, req.params.id);
  const existing = await findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = await saveItemChanges(existing, parseItem(req.body, existing), req.user.id, req.body.stockReason);

  res.json({ item });
}

export async function remove(req, res) {
  const id = parse(itemIdSchema, req.params.id);
  const existing = await findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = await removeItem(existing, req.user.id);
  res.json({ message: 'Item removido da loja.', item });
}

export async function reactivate(req, res) {
  const id = parse(itemIdSchema, req.params.id);
  const existing = await findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = await reactivateItem(id);
  res.json({ message: 'Item reativado na loja.', item });
}
