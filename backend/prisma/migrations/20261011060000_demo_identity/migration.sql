ALTER TABLE "campaigns" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- Somente o codigo reservado identifica a demo com certeza. Nao inferir
-- pelo id 1: a migration antiga tambem o usou para mesas reais.
UPDATE "campaigns" SET "is_demo" = true WHERE "invite_code" = 'MESADEMO';
CREATE UNIQUE INDEX "campaigns_one_demo" ON "campaigns" ("is_demo") WHERE "is_demo" = true;
