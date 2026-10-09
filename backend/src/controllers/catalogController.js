import {
  createCategory,
  createRarity,
  deleteCategory,
  deleteRarity,
  listCategories,
  listRarities,
  listStockMovements,
  updateCategory,
  updateRarity
} from '../models/catalogModel.js';
import {
  categoryIdSchema,
  categorySchema,
  rarityIdSchema,
  raritySchema,
  stockItemIdSchema
} from '../schemas/catalogSchemas.js';
import { parse } from '../utils/validation.js';

function parseCategory(body) {
  return parse(categorySchema, body);
}

function parseRarity(body) {
  return parse(raritySchema, { ...body, rank: body.rank || 1 });
}

export async function categoriesIndex(_req, res) {
  res.json({ categories: await listCategories() });
}

export async function categoriesCreate(req, res) {
  res.status(201).json({ category: await createCategory(parseCategory(req.body)) });
}

export async function categoriesUpdate(req, res) {
  res.json({
    category: await updateCategory(parse(categoryIdSchema, req.params.id), parseCategory(req.body))
  });
}

export async function categoriesRemove(req, res) {
  const result = await deleteCategory(parse(categoryIdSchema, req.params.id));
  const message =
    result.movedItems > 0
      ? `Categoria removida. ${result.movedItems} item(ns) movido(s) para Sem categoria.`
      : 'Categoria removida.';

  res.json({ message, ...result });
}

export async function raritiesIndex(_req, res) {
  res.json({ rarities: await listRarities() });
}

export async function raritiesCreate(req, res) {
  res.status(201).json({ rarity: await createRarity(parseRarity(req.body)) });
}

export async function raritiesUpdate(req, res) {
  res.json({
    rarity: await updateRarity(parse(rarityIdSchema, req.params.id), parseRarity(req.body))
  });
}

export async function raritiesRemove(req, res) {
  const result = await deleteRarity(parse(rarityIdSchema, req.params.id));
  const message =
    result.movedItems > 0
      ? `Raridade removida. ${result.movedItems} item(ns) movido(s) para Comum.`
      : 'Raridade removida.';

  res.json({ message, ...result });
}

export async function stockMovements(req, res) {
  const itemId = req.query.itemId ? parse(stockItemIdSchema, req.query.itemId) : undefined;

  res.json({ movements: await listStockMovements({ itemId }) });
}
