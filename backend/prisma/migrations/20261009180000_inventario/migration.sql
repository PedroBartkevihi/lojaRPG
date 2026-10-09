-- Venda de itens a loja, itens usados e recompensas do Mestre.

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "is_sellable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sell_price" INTEGER;

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" SERIAL NOT NULL,
    "character_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "actor_user_id" INTEGER,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_logs_character_id_idx" ON "inventory_logs"("character_id");

-- CreateIndex
CREATE INDEX "inventory_logs_item_id_idx" ON "inventory_logs"("item_id");

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Regras de integridade que o schema.prisma nao consegue descrever.
ALTER TABLE "items" ADD CONSTRAINT "items_sell_price_check" CHECK ("sell_price" IS NULL OR "sell_price" >= 0);
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_type_check" CHECK ("type" IN ('VENDA', 'USO', 'RECOMPENSA'));
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_unit_price_check" CHECK ("unit_price" >= 0);
