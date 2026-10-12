CREATE TABLE shops (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hours TEXT NOT NULL DEFAULT '',
  is_open BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT shops_campaign_id_name_key UNIQUE(campaign_id, name),
  CONSTRAINT shops_id_campaign_id_key UNIQUE(id, campaign_id)
);
CREATE UNIQUE INDEX shops_one_default ON shops(campaign_id) WHERE is_default;
INSERT INTO shops(campaign_id, name, is_open, is_default)
SELECT id, 'Geral', shop_open, true FROM campaigns;
ALTER TABLE items ADD COLUMN shop_id INTEGER;
UPDATE items SET shop_id = shops.id FROM shops WHERE shops.campaign_id = items.campaign_id AND shops.is_default;
ALTER TABLE items ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE items ADD CONSTRAINT items_shop_id_campaign_id_fkey FOREIGN KEY(shop_id, campaign_id) REFERENCES shops(id, campaign_id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX items_shop_id_idx ON items(shop_id);
ALTER TABLE campaigns DROP COLUMN shop_open;
