import { getDatabase } from './connection.js';

export function withTransaction(callback) {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    const result = callback(db);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}
