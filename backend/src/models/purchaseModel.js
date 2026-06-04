import { getDatabase } from '../database/connection.js';

function mapPurchase(row, db) {
  const items = db
    .prepare(
      `SELECT
        pi.id,
        pi.item_id AS itemId,
        i.name AS itemName,
        i.category,
        pi.quantity,
        pi.unit_price AS unitPrice,
        pi.quantity * pi.unit_price AS subtotal
       FROM purchase_items pi
       JOIN items i ON i.id = pi.item_id
       WHERE pi.purchase_id = ?
       ORDER BY i.name`
    )
    .all(row.id);

  return {
    id: row.id,
    characterId: row.characterId,
    characterName: row.characterName,
    userName: row.userName,
    totalValue: row.totalValue,
    purchasedAt: row.purchasedAt,
    items
  };
}

const purchaseSelect = `
  SELECT
    p.id,
    p.character_id AS characterId,
    c.name AS characterName,
    u.name AS userName,
    p.total_value AS totalValue,
    p.purchased_at AS purchasedAt
  FROM purchases p
  JOIN characters c ON c.id = p.character_id
  JOIN users u ON u.id = c.user_id
`;

export function createPurchase(data, db = getDatabase()) {
  const result = db
    .prepare('INSERT INTO purchases (character_id, total_value) VALUES (?, ?)')
    .run(data.characterId, data.totalValue);

  return findPurchaseById(result.lastInsertRowid, db);
}

export function addPurchaseItem(data, db = getDatabase()) {
  db
    .prepare(
      `INSERT INTO purchase_items (purchase_id, item_id, quantity, unit_price)
       VALUES (?, ?, ?, ?)`
    )
    .run(data.purchaseId, data.itemId, data.quantity, data.unitPrice);
}

export function findPurchaseById(id, db = getDatabase()) {
  const row = db.prepare(`${purchaseSelect} WHERE p.id = ?`).get(id);
  return row ? mapPurchase(row, db) : null;
}

export function listPurchases(filters = {}, db = getDatabase()) {
  const params = [];
  const where = [];

  if (filters.characterId) {
    where.push('p.character_id = ?');
    params.push(filters.characterId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  return db
    .prepare(`${purchaseSelect} ${whereSql} ORDER BY p.purchased_at DESC, p.id DESC`)
    .all(...params)
    .map((row) => mapPurchase(row, db));
}
