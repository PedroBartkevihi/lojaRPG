import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

it('migra os catálogos existentes para Geral preservando estoque e abertura', async () => {
  const url = process.env.TEST_DATABASE_URL || 'postgresql://lojarpg:lojarpg@127.0.0.1:5432/lojarpg_test';
  if (!new URL(url).pathname.endsWith('_test')) throw new Error('A migração só pode ser testada em banco _test.');
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const schema = `shop_migration_${randomBytes(6).toString('hex')}`;
  const sql = readFileSync(new URL('../prisma/migrations/20261012040000_campaign_shops/migration.sql', import.meta.url), 'utf8');
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE campaigns (id INTEGER PRIMARY KEY, shop_open BOOLEAN NOT NULL)');
      await tx.$executeRawUnsafe('CREATE TABLE items (id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL, stock INTEGER NOT NULL)');
      await tx.$executeRawUnsafe('INSERT INTO campaigns VALUES (1, false), (2, true)');
      await tx.$executeRawUnsafe('INSERT INTO items VALUES (10, 1, 17), (20, 2, 3)');
      for (const statement of sql.split(';').filter((s) => s.trim())) await tx.$executeRawUnsafe(statement);
      const rows = await tx.$queryRawUnsafe('SELECT i.id, i.stock, s.name, s.is_open FROM items i JOIN shops s ON s.id = i.shop_id ORDER BY i.id');
      expect(rows).toEqual([{ id: 10, stock: 17, name: 'Geral', is_open: false }, { id: 20, stock: 3, name: 'Geral', is_open: true }]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    });
  } finally { await prisma.$disconnect(); }
});
