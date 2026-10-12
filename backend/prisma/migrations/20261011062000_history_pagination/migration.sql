CREATE INDEX "inventory_logs_created_at_id_idx" ON "inventory_logs"("created_at", "id");
CREATE INDEX "purchases_purchased_at_id_idx" ON "purchases"("purchased_at", "id");
CREATE INDEX "gold_audit_logs_created_at_id_idx" ON "gold_audit_logs"("created_at", "id");
CREATE INDEX "stock_movements_created_at_id_idx" ON "stock_movements"("created_at", "id");
