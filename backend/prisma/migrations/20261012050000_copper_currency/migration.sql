BEGIN;
-- All monetary values are integer copper pieces. Widen before multiplying.
ALTER TABLE characters ALTER COLUMN gold TYPE BIGINT USING gold::bigint * 100;
ALTER TABLE characters ADD CONSTRAINT characters_gold_safe CHECK (gold BETWEEN 0 AND 9007199254740991);
ALTER TABLE items ALTER COLUMN price TYPE BIGINT USING price::bigint * 100;
ALTER TABLE items ADD CONSTRAINT items_price_safe CHECK (price BETWEEN 0 AND 9007199254740991);
ALTER TABLE items ALTER COLUMN sell_price TYPE BIGINT USING sell_price::bigint * 100;
ALTER TABLE items ADD CONSTRAINT items_sell_price_safe CHECK (sell_price BETWEEN 0 AND 9007199254740991);
ALTER TABLE purchases ALTER COLUMN total_value TYPE BIGINT USING total_value::bigint * 100;
ALTER TABLE purchases ADD CONSTRAINT purchases_total_value_safe CHECK (total_value BETWEEN 0 AND 9007199254740991);
ALTER TABLE purchase_items ALTER COLUMN unit_price TYPE BIGINT USING unit_price::bigint * 100;
ALTER TABLE purchase_items ADD CONSTRAINT purchase_items_unit_price_safe CHECK (unit_price BETWEEN 0 AND 9007199254740991);
ALTER TABLE inventory_logs ALTER COLUMN unit_price TYPE BIGINT USING unit_price::bigint * 100;
ALTER TABLE inventory_logs ADD CONSTRAINT inventory_logs_unit_price_safe CHECK (unit_price BETWEEN 0 AND 9007199254740991);
ALTER TABLE gold_audit_logs ALTER COLUMN previous_gold TYPE BIGINT USING previous_gold::bigint * 100;
ALTER TABLE gold_audit_logs ADD CONSTRAINT gold_audit_logs_previous_gold_safe CHECK (previous_gold BETWEEN 0 AND 9007199254740991);
ALTER TABLE gold_audit_logs ALTER COLUMN new_gold TYPE BIGINT USING new_gold::bigint * 100;
ALTER TABLE gold_audit_logs ADD CONSTRAINT gold_audit_logs_new_gold_safe CHECK (new_gold BETWEEN 0 AND 9007199254740991);
ALTER TABLE gold_audit_logs ALTER COLUMN delta TYPE BIGINT USING delta::bigint * 100;
ALTER TABLE gold_audit_logs ADD CONSTRAINT gold_audit_logs_delta_safe CHECK (delta BETWEEN -9007199254740991 AND 9007199254740991);
UPDATE checkout_requests SET response = jsonb_set(
  jsonb_set(response, '{character,gold}', to_jsonb((response #>> '{character,gold}')::bigint * 100)),
  '{purchase}', jsonb_set(
    jsonb_set(response->'purchase', '{totalValue}', to_jsonb((response #>> '{purchase,totalValue}')::bigint * 100)),
    '{items}', (SELECT COALESCE(jsonb_agg(jsonb_set(jsonb_set(entry, '{unitPrice}', to_jsonb((entry->>'unitPrice')::bigint * 100)), '{subtotal}', to_jsonb((entry->>'subtotal')::bigint * 100))), '[]'::jsonb)
      FROM jsonb_array_elements(response #> '{purchase,items}') AS entry)
  )) WHERE response IS NOT NULL;
UPDATE transfer_requests SET response = jsonb_set(response, '{character,gold}', to_jsonb((response #>> '{character,gold}')::bigint * 100)) WHERE response IS NOT NULL;
-- Keep old keys reserved: their hashes used gold pieces, so never execute them again.
ALTER TABLE transfer_requests ADD COLUMN currency_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transfer_requests ALTER COLUMN currency_version SET DEFAULT 2;
COMMIT;
