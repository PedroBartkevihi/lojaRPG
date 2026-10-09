-- Recria as tabelas para adicionar as regras CHECK que antes existiam apenas
-- em database/schema.sql e alinhar as colunas de data com o schema.prisma
-- (TEXT em vez de DATETIME). O SQLite nao permite ALTER TABLE ... ADD CHECK,
-- entao cada tabela e redefinida e os dados sao copiados.
--
-- A troca roda dentro de uma transacao: se algum registro ja violar uma regra
-- (ouro negativo, por exemplo), nada e alterado. Os PRAGMAs ficam fora dela
-- porque o SQLite ignora mudancas em foreign_keys dentro de transacoes.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN;

CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK ("role" IN ('MESTRE', 'JOGADOR')),
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "password_hash", "role") SELECT "created_at", "email", "id", "name", "password_hash", "role" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "new_characters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1 CHECK ("level" >= 1 AND "level" <= 20),
    "gold" INTEGER NOT NULL DEFAULT 0 CHECK ("gold" >= 0),
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_characters" ("class", "created_at", "gold", "id", "level", "name", "race", "user_id") SELECT "class", "created_at", "gold", "id", "level", "name", "race", "user_id" FROM "characters";
DROP TABLE "characters";
ALTER TABLE "new_characters" RENAME TO "characters";
CREATE INDEX "characters_user_id_idx" ON "characters"("user_id");

CREATE TABLE "new_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO "new_categories" ("created_at", "description", "id", "name", "updated_at") SELECT "created_at", "description", "id", "name", "updated_at" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

CREATE TABLE "new_rarities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO "new_rarities" ("created_at", "description", "id", "name", "rank", "updated_at") SELECT "created_at", "description", "id", "name", "rank", "updated_at" FROM "rarities";
DROP TABLE "rarities";
ALTER TABLE "new_rarities" RENAME TO "rarities";
CREATE UNIQUE INDEX "rarities_name_key" ON "rarities"("name");

CREATE TABLE "new_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "rarity_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL CHECK ("price" >= 0),
    "stock" INTEGER NOT NULL DEFAULT 0 CHECK ("stock" >= 0),
    "image_url" TEXT NOT NULL DEFAULT '',
    "created_by" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true CHECK ("is_active" IN (0, 1)),
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "items_rarity_id_fkey" FOREIGN KEY ("rarity_id") REFERENCES "rarities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_items" ("category_id", "created_at", "created_by", "description", "id", "image_url", "is_active", "name", "price", "rarity_id", "stock", "updated_at") SELECT "category_id", "created_at", "created_by", "description", "id", "image_url", "is_active", "name", "price", "rarity_id", "stock", "updated_at" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE INDEX "items_category_id_idx" ON "items"("category_id");
CREATE INDEX "items_rarity_id_idx" ON "items"("rarity_id");
CREATE INDEX "items_name_idx" ON "items"("name");

CREATE TABLE "new_inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "character_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    CONSTRAINT "inventory_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventory" ("character_id", "id", "item_id", "quantity") SELECT "character_id", "id", "item_id", "quantity" FROM "inventory";
DROP TABLE "inventory";
ALTER TABLE "new_inventory" RENAME TO "inventory";
CREATE UNIQUE INDEX "inventory_character_id_item_id_key" ON "inventory"("character_id", "item_id");
CREATE INDEX "inventory_character_id_idx" ON "inventory"("character_id");

CREATE TABLE "new_purchases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "character_id" INTEGER NOT NULL,
    "total_value" INTEGER NOT NULL CHECK ("total_value" >= 0),
    "purchased_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    CONSTRAINT "purchases_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_purchases" ("character_id", "id", "purchased_at", "total_value") SELECT "character_id", "id", "purchased_at", "total_value" FROM "purchases";
DROP TABLE "purchases";
ALTER TABLE "new_purchases" RENAME TO "purchases";
CREATE INDEX "purchases_character_id_idx" ON "purchases"("character_id");

CREATE TABLE "new_purchase_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchase_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "unit_price" INTEGER NOT NULL CHECK ("unit_price" >= 0),
    CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_items" ("id", "item_id", "purchase_id", "quantity", "unit_price") SELECT "id", "item_id", "purchase_id", "quantity", "unit_price" FROM "purchase_items";
DROP TABLE "purchase_items";
ALTER TABLE "new_purchase_items" RENAME TO "purchase_items";

CREATE TABLE "new_gold_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actor_user_id" INTEGER NOT NULL,
    "character_id" INTEGER NOT NULL,
    "previous_gold" INTEGER NOT NULL CHECK ("previous_gold" >= 0),
    "new_gold" INTEGER NOT NULL CHECK ("new_gold" >= 0),
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    CONSTRAINT "gold_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gold_audit_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_gold_audit_logs" ("actor_user_id", "character_id", "created_at", "delta", "id", "new_gold", "previous_gold", "reason") SELECT "actor_user_id", "character_id", "created_at", "delta", "id", "new_gold", "previous_gold", "reason" FROM "gold_audit_logs";
DROP TABLE "gold_audit_logs";
ALTER TABLE "new_gold_audit_logs" RENAME TO "gold_audit_logs";
CREATE INDEX "gold_audit_logs_actor_user_id_idx" ON "gold_audit_logs"("actor_user_id");
CREATE INDEX "gold_audit_logs_character_id_idx" ON "gold_audit_logs"("character_id");

CREATE TABLE "new_refresh_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TEXT NOT NULL,
    "revoked_at" TEXT,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_refresh_tokens" ("created_at", "expires_at", "id", "revoked_at", "token_hash", "user_id") SELECT "created_at", "expires_at", "id", "revoked_at", "token_hash", "user_id" FROM "refresh_tokens";
DROP TABLE "refresh_tokens";
ALTER TABLE "new_refresh_tokens" RENAME TO "refresh_tokens";
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE TABLE "new_stock_movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "item_id" INTEGER NOT NULL,
    "actor_user_id" INTEGER,
    "previous_stock" INTEGER NOT NULL CHECK ("previous_stock" >= 0),
    "new_stock" INTEGER NOT NULL CHECK ("new_stock" >= 0),
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_stock_movements" ("actor_user_id", "created_at", "delta", "id", "item_id", "new_stock", "previous_stock", "reason") SELECT "actor_user_id", "created_at", "delta", "id", "item_id", "new_stock", "previous_stock", "reason" FROM "stock_movements";
DROP TABLE "stock_movements";
ALTER TABLE "new_stock_movements" RENAME TO "stock_movements";
CREATE INDEX "stock_movements_item_id_idx" ON "stock_movements"("item_id");
CREATE INDEX "stock_movements_actor_user_id_idx" ON "stock_movements"("actor_user_id");

COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
