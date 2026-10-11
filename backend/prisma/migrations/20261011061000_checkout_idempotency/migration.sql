CREATE TABLE "checkout_requests" (
  "user_id" INTEGER NOT NULL,
  "campaign_id" INTEGER NOT NULL,
  "key" VARCHAR(36) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "response" JSONB,
  CONSTRAINT "checkout_requests_pkey" PRIMARY KEY ("user_id", "campaign_id", "key"),
  CONSTRAINT "checkout_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "checkout_requests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "checkout_requests_campaign_id_idx" ON "checkout_requests"("campaign_id");
