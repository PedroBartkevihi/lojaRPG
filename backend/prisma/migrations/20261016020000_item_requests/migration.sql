-- Encomendas ao Mestre (A7). Tabela nova, sem tocar nos dados existentes.
CREATE TABLE "item_requests" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "character_id" INTEGER NOT NULL,
    "requested_by" INTEGER,
    "description" TEXT NOT NULL,
    "max_price" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "price" BIGINT,
    "item_id" INTEGER,
    "purchase_id" INTEGER,
    "master_note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "item_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "item_requests_status_check" CHECK ("status" IN ('PENDENTE', 'APROVADA', 'RECUSADA', 'CANCELADA')),
    CONSTRAINT "item_requests_max_price_check" CHECK ("max_price" >= 0),
    CONSTRAINT "item_requests_price_check" CHECK ("price" IS NULL OR ("price" >= 0 AND "price" <= "max_price"))
);

CREATE UNIQUE INDEX "item_requests_purchase_id_key" ON "item_requests"("purchase_id");
CREATE INDEX "item_requests_campaign_id_status_idx" ON "item_requests"("campaign_id", "status");
CREATE INDEX "item_requests_character_id_idx" ON "item_requests"("character_id");

ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "item_requests" ADD CONSTRAINT "item_requests_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
