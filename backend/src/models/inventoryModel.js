import { getDatabase } from '../database/connection.js';

function mapInventoryItem(row) {
  return {
    id: row.id,
    characterId: row.characterId,
    itemId: row.itemId,
    quantity: row.quantity,
    item: {
      id: row.itemId,
      name: row.itemName,
      category: row.category,
      rarity: row.rarity,
      description: row.description,
      price: row.price,
      isActive: Boolean(row.isActive)
    }
  };
}

export function listInventoryByCharacterId(characterId, db = getDatabase()) {
  return db
    .prepare(
      `SELECT
        inv.id,
        inv.character_id AS characterId,
        inv.item_id AS itemId,
        inv.quantity,
        i.name AS itemName,
        i.category,
        i.rarity,
        i.description,
        i.price,
        i.is_active AS isActive
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       WHERE inv.character_id = ?
       ORDER BY i.category, i.name`
    )
    .all(characterId)
    .map(mapInventoryItem);
}

export function addInventoryItem(characterId, itemId, quantity, db = getDatabase()) {
  db
    .prepare(
      `INSERT INTO inventory (character_id, item_id, quantity)
       VALUES (?, ?, ?)
       ON CONFLICT(character_id, item_id)
       DO UPDATE SET quantity = quantity + excluded.quantity`
    )
    .run(characterId, itemId, quantity);
}
