import { createItem, deactivateItem, findItemById, listItems, reactivateItem, updateItem } from '../models/itemModel.js';
import { createStockMovement } from '../models/catalogModel.js';
import { ApiError } from '../utils/ApiError.js';
import * as validate from '../utils/validation.js';

function parseItem(body, existing = {}) {
  const hasExisting = Boolean(existing.id);

  return {
    name:
      body.name === undefined && hasExisting
        ? existing.name
        : validate.requiredString(body.name, 'Nome do item', 140),
    category:
      body.category === undefined && hasExisting
        ? existing.category
        : validate.requiredString(body.category, 'Categoria', 80),
    description:
      body.description === undefined && hasExisting
        ? existing.description || ''
        : validate.optionalString(body.description, 1200),
    price:
      body.price === undefined && hasExisting
        ? existing.price
        : validate.integer(body.price, 'Preco', { min: 0, max: 1000000 }),
    rarity:
      body.rarity === undefined && hasExisting
        ? existing.rarity || 'Comum'
        : validate.requiredString(body.rarity, 'Raridade', 80),
    stock:
      body.stock === undefined && hasExisting
        ? existing.stock
        : validate.integer(body.stock, 'Estoque', { min: 0, max: 100000 }),
    imageUrl:
      body.imageUrl === undefined && hasExisting
        ? existing.imageUrl || ''
        : validate.optionalString(body.imageUrl, 1000)
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
  const item = await findItemById(validate.integer(req.params.id, 'Id do item', { min: 1 }), {
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
  const id = validate.integer(req.params.id, 'Id do item', { min: 1 });
  const existing = await findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = await updateItem(id, parseItem(req.body, existing));

  if (item.stock !== existing.stock) {
    await createStockMovement({
      itemId: item.id,
      actorUserId: req.user.id,
      previousStock: existing.stock,
      newStock: item.stock,
      reason: req.body.stockReason || 'Ajuste manual de estoque'
    });
  }

  res.json({ item });
}

export async function remove(req, res) {
  const id = validate.integer(req.params.id, 'Id do item', { min: 1 });
  const existing = await findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = await deactivateItem(id);
  if (existing.stock !== item.stock) {
    await createStockMovement({
      itemId: item.id,
      actorUserId: req.user.id,
      previousStock: existing.stock,
      newStock: item.stock,
      reason: 'Item removido da loja'
    });
  }
  res.json({ message: 'Item removido da loja.', item });
}

export async function reactivate(req, res) {
  const id = validate.integer(req.params.id, 'Id do item', { min: 1 });
  const existing = await findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = await reactivateItem(id);
  res.json({ message: 'Item reativado na loja.', item });
}
