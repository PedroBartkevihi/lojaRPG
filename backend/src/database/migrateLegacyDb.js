import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { env, projectRoot } from '../config/env.js';

const db = new DatabaseSync(env.databaseFile);

function tableExists(name) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function tableColumns(name) {
  return db.prepare(`PRAGMA table_info(${name})`).all().map((column) => column.name);
}

function assertNoBackupTables() {
  const existingBackups = ['characters', 'items', 'inventory', 'purchases', 'purchase_items']
    .map((table) => `${table}_legacy_backup`)
    .filter(tableExists);

  if (existingBackups.length > 0) {
    throw new Error(`Tabelas de backup ja existem: ${existingBackups.join(', ')}`);
  }
}

function loadSchemaSql() {
  const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
  return fs.readFileSync(schemaPath, 'utf8').replace('PRAGMA foreign_keys = ON;', '');
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function renameIfExists(table) {
  if (tableExists(table)) {
    db.exec(`ALTER TABLE ${quoteIdentifier(table)} RENAME TO ${quoteIdentifier(`${table}_legacy_backup`)}`);
  }
}

try {
  if (!tableExists('items')) {
    db.exec(loadSchemaSql());
    console.log('Banco inicializado com o schema atual.');
    process.exit(0);
  }

  if (tableColumns('items').includes('category_id')) {
    console.log('Banco ja esta no formato atual.');
    process.exit(0);
  }

  if (!tableColumns('items').includes('category')) {
    throw new Error('Schema legado nao reconhecido: coluna items.category ausente.');
  }

  assertNoBackupTables();

  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN;');

  db.exec(`
    DROP INDEX IF EXISTS idx_items_category;
    DROP INDEX IF EXISTS idx_items_name;
    DROP INDEX IF EXISTS idx_purchases_character;
    DROP INDEX IF EXISTS idx_inventory_character;
  `);

  ['purchase_items', 'purchases', 'inventory', 'items', 'characters'].forEach(renameIfExists);
  db.exec(loadSchemaSql());

  db.exec(`
    INSERT OR IGNORE INTO categories (name)
    SELECT DISTINCT COALESCE(NULLIF(TRIM(category), ''), 'Sem categoria')
    FROM items_legacy_backup;

    INSERT OR IGNORE INTO rarities (name, rank)
    SELECT DISTINCT COALESCE(NULLIF(TRIM(rarity), ''), 'Comum'), 1
    FROM items_legacy_backup;

    INSERT INTO characters (id, user_id, name, class, race, level, gold, created_at)
    SELECT id, user_id, name, class, race, level, gold, COALESCE(created_at, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    FROM characters_legacy_backup;

    INSERT INTO items (
      id, name, category_id, rarity_id, description, price, stock, image_url,
      created_by, is_active, created_at, updated_at
    )
    SELECT
      item.id,
      item.name,
      category.id,
      rarity.id,
      item.description,
      item.price,
      item.stock,
      '',
      item.created_by,
      item.is_active,
      COALESCE(item.created_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      COALESCE(item.updated_at, item.created_at, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    FROM items_legacy_backup item
    JOIN categories category ON category.name = COALESCE(NULLIF(TRIM(item.category), ''), 'Sem categoria')
    JOIN rarities rarity ON rarity.name = COALESCE(NULLIF(TRIM(item.rarity), ''), 'Comum');

    INSERT INTO inventory (id, character_id, item_id, quantity)
    SELECT id, character_id, item_id, quantity
    FROM inventory_legacy_backup;

    INSERT INTO purchases (id, character_id, total_value, purchased_at)
    SELECT id, character_id, total_value, COALESCE(purchased_at, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    FROM purchases_legacy_backup;

    INSERT INTO purchase_items (id, purchase_id, item_id, quantity, unit_price)
    SELECT id, purchase_id, item_id, quantity, unit_price
    FROM purchase_items_legacy_backup;
  `);

  db.exec('COMMIT;');
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('Migracao legada concluida. Tabelas antigas mantidas como *_legacy_backup.');
} catch (error) {
  try {
    db.exec('ROLLBACK;');
  } catch (_rollbackError) {
    // Transacao pode nao ter sido iniciada.
  }

  console.error(error);
  process.exitCode = 1;
} finally {
  db.close();
}
