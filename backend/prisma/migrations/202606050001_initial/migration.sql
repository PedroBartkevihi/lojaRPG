PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "users" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "characters" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "class" TEXT NOT NULL,
  "race" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "gold" INTEGER NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "characters_user_id_idx" ON "characters"("user_id");

CREATE TABLE IF NOT EXISTS "categories" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");

CREATE TABLE IF NOT EXISTS "rarities" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "rank" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT NOT NULL DEFAULT '',
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "rarities_name_key" ON "rarities"("name");

CREATE TABLE IF NOT EXISTS "items" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "category_id" INTEGER NOT NULL,
  "rarity_id" INTEGER NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "price" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "image_url" TEXT NOT NULL DEFAULT '',
  "created_by" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "items_rarity_id_fkey" FOREIGN KEY ("rarity_id") REFERENCES "rarities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "items_name_idx" ON "items"("name");
CREATE INDEX IF NOT EXISTS "items_category_id_idx" ON "items"("category_id");
CREATE INDEX IF NOT EXISTS "items_rarity_id_idx" ON "items"("rarity_id");

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "character_id" INTEGER NOT NULL,
  "item_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "inventory_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_character_id_item_id_key" ON "inventory"("character_id", "item_id");
CREATE INDEX IF NOT EXISTS "inventory_character_id_idx" ON "inventory"("character_id");

CREATE TABLE IF NOT EXISTS "purchases" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "character_id" INTEGER NOT NULL,
  "total_value" INTEGER NOT NULL,
  "purchased_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT "purchases_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "purchases_character_id_idx" ON "purchases"("character_id");

CREATE TABLE IF NOT EXISTS "purchase_items" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "purchase_id" INTEGER NOT NULL,
  "item_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" INTEGER NOT NULL,
  CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchase_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "gold_audit_logs" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "actor_user_id" INTEGER NOT NULL,
  "character_id" INTEGER NOT NULL,
  "previous_gold" INTEGER NOT NULL,
  "new_gold" INTEGER NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT "gold_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "gold_audit_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gold_audit_logs_actor_user_id_idx" ON "gold_audit_logs"("actor_user_id");
CREATE INDEX IF NOT EXISTS "gold_audit_logs_character_id_idx" ON "gold_audit_logs"("character_id");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" DATETIME NOT NULL,
  "revoked_at" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "item_id" INTEGER NOT NULL,
  "actor_user_id" INTEGER,
  "previous_stock" INTEGER NOT NULL,
  "new_stock" INTEGER NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "stock_movements_item_id_idx" ON "stock_movements"("item_id");
CREATE INDEX IF NOT EXISTS "stock_movements_actor_user_id_idx" ON "stock_movements"("actor_user_id");
