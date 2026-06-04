import { createItem, deactivateItem, findItemById, listItems, updateItem } from '../models/itemModel.js';
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
        : validate.integer(body.stock, 'Estoque', { min: 0, max: 100000 })
  };
}

export function index(req, res) {
  const includeInactive = req.query.includeInactive === 'true' && req.user.role === 'MESTRE';
  const items = listItems({
    search: req.query.search?.trim(),
    category: req.query.category?.trim(),
    includeInactive
  });

  res.json({ items });
}

export function show(req, res) {
  const item = findItemById(validate.integer(req.params.id, 'Id do item', { min: 1 }), {
    includeInactive: req.user.role === 'MESTRE'
  });

  if (!item) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  res.json({ item });
}

export function create(req, res) {
  const item = createItem({
    ...parseItem(req.body),
    createdBy: req.user.id
  });

  res.status(201).json({ item });
}

export function update(req, res) {
  const id = validate.integer(req.params.id, 'Id do item', { min: 1 });
  const existing = findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = updateItem(id, parseItem(req.body, existing));
  res.json({ item });
}

export function remove(req, res) {
  const id = validate.integer(req.params.id, 'Id do item', { min: 1 });
  const existing = findItemById(id, { includeInactive: true });

  if (!existing) {
    throw new ApiError(404, 'Item nao encontrado.');
  }

  const item = deactivateItem(id);
  res.json({ message: 'Item removido da loja.', item });
}
