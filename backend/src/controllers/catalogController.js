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
import * as validate from '../utils/validation.js';

function parseCategory(body) {
  return {
    name: validate.requiredString(body.name, 'Nome da categoria', 80),
    description: validate.optionalString(body.description, 500)
  };
}

function parseRarity(body) {
  return {
    name: validate.requiredString(body.name, 'Nome da raridade', 80),
    rank: validate.integer(body.rank || 1, 'Rank da raridade', { min: 1, max: 100 }),
    description: validate.optionalString(body.description, 500)
  };
}

export async function categoriesIndex(_req, res) {
  res.json({ categories: await listCategories() });
}

export async function categoriesCreate(req, res) {
  res.status(201).json({ category: await createCategory(parseCategory(req.body)) });
}

export async function categoriesUpdate(req, res) {
  res.json({
    category: await updateCategory(validate.integer(req.params.id, 'Id da categoria', { min: 1 }), parseCategory(req.body))
  });
}

export async function categoriesRemove(req, res) {
  const result = await deleteCategory(validate.integer(req.params.id, 'Id da categoria', { min: 1 }));
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
    rarity: await updateRarity(validate.integer(req.params.id, 'Id da raridade', { min: 1 }), parseRarity(req.body))
  });
}

export async function raritiesRemove(req, res) {
  const result = await deleteRarity(validate.integer(req.params.id, 'Id da raridade', { min: 1 }));
  const message =
    result.movedItems > 0
      ? `Raridade removida. ${result.movedItems} item(ns) movido(s) para Comum.`
      : 'Raridade removida.';

  res.json({ message, ...result });
}

export async function stockMovements(req, res) {
  const itemId = req.query.itemId
    ? validate.integer(req.query.itemId, 'Id do item', { min: 1 })
    : undefined;

  res.json({ movements: await listStockMovements({ itemId }) });
}
