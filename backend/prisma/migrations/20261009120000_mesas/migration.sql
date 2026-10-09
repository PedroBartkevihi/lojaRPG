-- Mesas: cada campanha tem seu Mestre, seus jogadores e seu proprio catalogo.
-- O papel (Mestre ou jogador) deixa de ser da conta e passa a ser da mesa.

-- CreateTable
CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_members" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_invite_code_key" ON "campaigns"("invite_code");

-- CreateIndex
CREATE INDEX "campaign_members_user_id_idx" ON "campaign_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_members_campaign_id_user_id_key" ON "campaign_members"("campaign_id", "user_id");

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Um banco que ja tinha dados ganha uma mesa com tudo o que existia, e cada
-- usuario entra nela com o papel que tinha na conta. Num banco vazio nada e
-- criado.
INSERT INTO "campaigns" ("name", "invite_code")
SELECT 'Mesa principal', upper(substr(md5(random()::text), 1, 8))
WHERE EXISTS (SELECT 1 FROM "users")
   OR EXISTS (SELECT 1 FROM "categories")
   OR EXISTS (SELECT 1 FROM "rarities");

INSERT INTO "campaign_members" ("campaign_id", "user_id", "role")
SELECT (SELECT MIN("id") FROM "campaigns"), "id", "role" FROM "users";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role";

-- AlterTable
ALTER TABLE "characters" ADD COLUMN "campaign_id" INTEGER;
ALTER TABLE "categories" ADD COLUMN "campaign_id" INTEGER;
ALTER TABLE "rarities" ADD COLUMN "campaign_id" INTEGER;
ALTER TABLE "items" ADD COLUMN "campaign_id" INTEGER;

UPDATE "characters" SET "campaign_id" = (SELECT MIN("id") FROM "campaigns");
UPDATE "categories" SET "campaign_id" = (SELECT MIN("id") FROM "campaigns");
UPDATE "rarities" SET "campaign_id" = (SELECT MIN("id") FROM "campaigns");
UPDATE "items" SET "campaign_id" = (SELECT MIN("id") FROM "campaigns");

ALTER TABLE "characters" ALTER COLUMN "campaign_id" SET NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "campaign_id" SET NOT NULL;
ALTER TABLE "rarities" ALTER COLUMN "campaign_id" SET NOT NULL;
ALTER TABLE "items" ALTER COLUMN "campaign_id" SET NOT NULL;

-- Nomes de categoria e raridade passam a ser unicos dentro de cada mesa.
-- DropIndex
DROP INDEX "categories_name_key";

-- DropIndex
DROP INDEX "rarities_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "categories_campaign_id_name_key" ON "categories"("campaign_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "rarities_campaign_id_name_key" ON "rarities"("campaign_id", "name");

-- CreateIndex
CREATE INDEX "characters_campaign_id_idx" ON "characters"("campaign_id");

-- CreateIndex
CREATE INDEX "items_campaign_id_idx" ON "items"("campaign_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rarities" ADD CONSTRAINT "rarities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- O papel que saiu de users vale agora por mesa, com a mesma regra.
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_role_check" CHECK ("role" IN ('MESTRE', 'JOGADOR'));
