import { getDatabase } from '../database/connection.js';

function mapCharacter(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    name: row.name,
    className: row.className,
    race: row.race,
    level: row.level,
    gold: row.gold,
    createdAt: row.createdAt
  };
}

const characterSelect = `
  SELECT
    c.id,
    c.user_id AS userId,
    u.name AS userName,
    u.email AS userEmail,
    c.name,
    c.class AS className,
    c.race,
    c.level,
    c.gold,
    c.created_at AS createdAt
  FROM characters c
  JOIN users u ON u.id = c.user_id
`;

export function listCharacters(db = getDatabase()) {
  return db
    .prepare(`${characterSelect} ORDER BY c.name`)
    .all()
    .map(mapCharacter);
}

export function findCharacterById(id, db = getDatabase()) {
  const row = db.prepare(`${characterSelect} WHERE c.id = ?`).get(id);
  return mapCharacter(row);
}

export function findCharacterByUserId(userId, db = getDatabase()) {
  const row = db.prepare(`${characterSelect} WHERE c.user_id = ?`).get(userId);
  return mapCharacter(row);
}

export function createCharacter(data, db = getDatabase()) {
  const result = db
    .prepare(
      `INSERT INTO characters (user_id, name, class, race, level, gold)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.userId, data.name, data.className, data.race, data.level, data.gold);

  return findCharacterById(result.lastInsertRowid, db);
}

export function updateCharacter(id, data, db = getDatabase()) {
  db
    .prepare(
      `UPDATE characters
       SET name = ?, class = ?, race = ?, level = ?
       WHERE id = ?`
    )
    .run(data.name, data.className, data.race, data.level, id);

  return findCharacterById(id, db);
}

export function setCharacterGold(id, gold, db = getDatabase()) {
  db.prepare('UPDATE characters SET gold = ? WHERE id = ?').run(gold, id);
  return findCharacterById(id, db);
}
