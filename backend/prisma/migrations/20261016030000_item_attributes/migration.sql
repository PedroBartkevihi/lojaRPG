-- Atributos de item e forca do personagem (A6). Colunas novas com valores
-- padrao: os itens existentes ficam sem peso, dano ou CA, e os personagens
-- com forca 10 (capacidade de 150 libras), ate o Mestre ou o jogador mudar.
ALTER TABLE "items" ADD COLUMN "weight" DECIMAL(8,2);
ALTER TABLE "items" ADD COLUMN "damage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "items" ADD COLUMN "armor_class" TEXT NOT NULL DEFAULT '';
ALTER TABLE "items" ADD COLUMN "requires_attunement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "items" ADD CONSTRAINT "items_weight_check" CHECK ("weight" IS NULL OR "weight" >= 0);

ALTER TABLE "characters" ADD COLUMN "strength" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "characters" ADD CONSTRAINT "characters_strength_check" CHECK ("strength" BETWEEN 1 AND 30);
