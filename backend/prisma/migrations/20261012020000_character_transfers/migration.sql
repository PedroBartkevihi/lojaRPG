CREATE TABLE "transfer_requests" (
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "campaign_id" INTEGER NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "key" VARCHAR(36) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "response" JSONB,
  PRIMARY KEY ("user_id", "campaign_id", "key")
);
CREATE INDEX "transfer_requests_campaign_id_idx" ON "transfer_requests"("campaign_id");
ALTER TABLE "inventory_logs" DROP CONSTRAINT "inventory_logs_type_check";
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_type_check" CHECK ("type" IN ('VENDA', 'USO', 'RECOMPENSA', 'TROCA'));
