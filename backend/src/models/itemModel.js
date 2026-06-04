import { getDatabase } from '../database/connection.js';

function mapItem(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: row.price,
    rarity: row.rarity,
    stock: row.stock,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

const itemSelect = `
  SELECT
    i.id,
    i.name,
    i.category,
    i.description,
    i.price,
    i.rarity,
    i.stock,
    i.created_by AS createdBy,
    u.name AS createdByName,
    i.is_active AS isActive,
    i.created_at AS createdAt,
    i.updated_at AS updatedAt
  FROM items i
  LEFT JOIN users u ON u.id = i.created_by
`;

export function listItems(filters = {}, db = getDatabase()) {
  const where = [];
  const params = [];

  if (!filters.includeInactive) {
    where.push('i.is_active = 1');
  }

  if (filters.search) {
    where.push('LOWER(i.name) LIKE ?');
    params.push(`%${filters.search.toLowerCase()}%`);
  }

  if (filters.category) {
    where.push('i.category = ?');
    params.push(filters.category);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  return db
    .prepare(`${itemSelect} ${whereSql} ORDER BY i.category, i.name`)
    .all(...params)
    .map(mapItem);
}

export function findItemById(id, options = {}, db = getDatabase()) {
  const whereSql = options.includeInactive ? 'WHERE i.id = ?' : 'WHERE i.id = ? AND i.is_active = 1';
  const row = db.prepare(`${itemSelect} ${whereSql}`).get(id);
  return mapItem(row);
}

export function findItemsByIds(ids, db = getDatabase()) {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');
  return db
    .prepare(`${itemSelect} WHERE i.id IN (${placeholders})`)
    .all(...ids)
    .map(mapItem);
}

export function createItem(data, db = getDatabase()) {
  const result = db
    .prepare(
      `INSERT INTO items (name, category, description, price, rarity, stock, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.name, data.category, data.description, data.price, data.rarity, data.stock, data.createdBy);

  return findItemById(result.lastInsertRowid, { includeInactive: true }, db);
}

export function updateItem(id, data, db = getDatabase()) {
  db
    .prepare(
      `UPDATE items
       SET name = ?, category = ?, description = ?, price = ?, rarity = ?, stock = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(data.name, data.category, data.description, data.price, data.rarity, data.stock, id);

  return findItemById(id, { includeInactive: true }, db);
}

export function deactivateItem(id, db = getDatabase()) {
  db
    .prepare(
      `UPDATE items
       SET is_active = 0, stock = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(id);

  return findItemById(id, { includeInactive: true }, db);
}
