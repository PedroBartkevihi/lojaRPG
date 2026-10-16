-- Descontos e eventos de preco (A8). Tabela nova, sem tocar nos dados
-- existentes; compras antigas mantem o preco registrado.
CREATE TABLE "price_discounts" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "category_id" INTEGER,
    "character_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_discounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "price_discounts_percent_check" CHECK ("percent" BETWEEN 1 AND 90)
);

CREATE INDEX "price_discounts_campaign_id_idx" ON "price_discounts"("campaign_id");

ALTER TABLE "price_discounts" ADD CONSTRAINT "price_discounts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_discounts" ADD CONSTRAINT "price_discounts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_discounts" ADD CONSTRAINT "price_discounts_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
