CREATE TABLE "campaign_sessions" (
  "id" SERIAL PRIMARY KEY,
  "campaign_id" INTEGER NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "number" INTEGER NOT NULL CHECK ("number" > 0),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3), "notes" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "campaign_sessions_time_check" CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at")
);
CREATE UNIQUE INDEX "campaign_sessions_campaign_id_number_key" ON "campaign_sessions"("campaign_id", "number");
CREATE UNIQUE INDEX "campaign_sessions_one_open" ON "campaign_sessions"("campaign_id") WHERE "ended_at" IS NULL;
CREATE INDEX "campaign_sessions_campaign_id_started_at_id_idx" ON "campaign_sessions"("campaign_id", "started_at", "id");
ALTER TABLE "purchases" ADD COLUMN "session_id" INTEGER REFERENCES "campaign_sessions"("id") ON DELETE SET NULL;
CREATE INDEX "purchases_session_id_idx" ON "purchases"("session_id");
ALTER TABLE "inventory_logs" ADD COLUMN "session_id" INTEGER REFERENCES "campaign_sessions"("id") ON DELETE SET NULL;
CREATE INDEX "inventory_logs_session_id_idx" ON "inventory_logs"("session_id");
ALTER TABLE "gold_audit_logs" ADD COLUMN "session_id" INTEGER REFERENCES "campaign_sessions"("id") ON DELETE SET NULL;
CREATE INDEX "gold_audit_logs_session_id_idx" ON "gold_audit_logs"("session_id");
ALTER TABLE "stock_movements" ADD COLUMN "session_id" INTEGER REFERENCES "campaign_sessions"("id") ON DELETE SET NULL;
CREATE INDEX "stock_movements_session_id_idx" ON "stock_movements"("session_id");
