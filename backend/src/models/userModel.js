import { getDatabase } from '../database/connection.js';

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt
  };
}

export function createUser(data, db = getDatabase()) {
  const result = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`
    )
    .run(data.name, data.email, data.passwordHash, data.role);

  return findUserById(result.lastInsertRowid, db);
}

export function findUserById(id, db = getDatabase()) {
  const row = db
    .prepare(
      `SELECT id, name, email, role, created_at AS createdAt
       FROM users
       WHERE id = ?`
    )
    .get(id);

  return mapUser(row);
}

export function findUserByEmail(email, db = getDatabase()) {
  const row = db
    .prepare(
      `SELECT id, name, email, role, created_at AS createdAt
       FROM users
       WHERE email = ?`
    )
    .get(email);

  return mapUser(row);
}

export function findUserByEmailWithPassword(email, db = getDatabase()) {
  return db
    .prepare(
      `SELECT
        id,
        name,
        email,
        role,
        password_hash AS passwordHash,
        created_at AS createdAt
       FROM users
       WHERE email = ?`
    )
    .get(email);
}

export function countUsers(db = getDatabase()) {
  const row = db.prepare('SELECT COUNT(*) AS total FROM users').get();
  return row.total;
}
