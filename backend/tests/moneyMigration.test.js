import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

it('converte dinheiro e snapshots de operações antigas sem overflow ou perda do histórico', async () => {
  const url = process.env.TEST_DATABASE_URL || 'postgresql://lojarpg:lojarpg@127.0.0.1:5432/lojarpg_test';
  if (!new URL(url).pathname.endsWith('_test')) throw new Error('Use somente um banco _test.');
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const schema = `money_migration_${randomBytes(6).toString('hex')}`;
  const sql = readFileSync(new URL('../prisma/migrations/20261012050000_copper_currency/migration.sql', import.meta.url), 'utf8');
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      const fixtures = [
        ['characters', 'gold INTEGER CHECK(gold >= 0)', '(2147483647)'],
        ['items', 'price INTEGER, sell_price INTEGER', '(75, NULL), (50, 40)'],
        ['purchases', 'total_value INTEGER', '(50)'],
        ['purchase_items', 'unit_price INTEGER', '(25)'],
        ['inventory_logs', 'unit_price INTEGER', '(37)'],
        ['gold_audit_logs', 'previous_gold INTEGER, new_gold INTEGER, delta INTEGER', '(100, 75, -25)']
      ];
      for (const [table, columns, values] of fixtures) {
        await tx.$executeRawUnsafe(`CREATE TABLE ${table} (${columns})`);
        await tx.$executeRawUnsafe(`INSERT INTO ${table} VALUES ${values}`);
      }
      for (const table of ['checkout_requests', 'transfer_requests']) await tx.$executeRawUnsafe(`CREATE TABLE ${table} (response JSONB)`);
      await tx.$executeRawUnsafe('INSERT INTO checkout_requests VALUES ($1::jsonb)', JSON.stringify({ character: { gold: 200 }, purchase: { id: 42, totalValue: 50, items: [{ itemId: 6, quantity: 2, unitPrice: 25, subtotal: 50 }] } }));
      await tx.$executeRawUnsafe('INSERT INTO transfer_requests VALUES ($1::jsonb)', JSON.stringify({ character: { gold: 230 }, message: 'OK' }));
      // The test already owns a transaction; production uses BEGIN/COMMIT in the migration.
      for (const statement of sql.split(';').filter((s) => s.trim() && !['BEGIN', 'COMMIT'].includes(s.trim()))) await tx.$executeRawUnsafe(statement);
      expect(await tx.$queryRawUnsafe('SELECT gold FROM characters')).toEqual([{ gold: 214748364700n }]);
      expect(await tx.$queryRawUnsafe('SELECT * FROM items ORDER BY price DESC')).toEqual([{ price: 7500n, sell_price: null }, { price: 5000n, sell_price: 4000n }]);
      expect(await tx.$queryRawUnsafe('SELECT * FROM purchases')).toEqual([{ total_value: 5000n }]);
      expect(await tx.$queryRawUnsafe('SELECT * FROM purchase_items')).toEqual([{ unit_price: 2500n }]);
      expect(await tx.$queryRawUnsafe('SELECT * FROM inventory_logs')).toEqual([{ unit_price: 3700n }]);
      expect(await tx.$queryRawUnsafe('SELECT * FROM gold_audit_logs')).toEqual([{ previous_gold: 10000n, new_gold: 7500n, delta: -2500n }]);
      const [cached] = await tx.$queryRawUnsafe('SELECT response FROM checkout_requests');
      expect(cached.response).toEqual({ character: { gold: 20000 }, purchase: { id: 42, totalValue: 5000, items: [{ itemId: 6, quantity: 2, unitPrice: 2500, subtotal: 5000 }] } });
      expect(await tx.$queryRawUnsafe('SELECT * FROM transfer_requests')).toEqual([{ response: { character: { gold: 23000 }, message: 'OK' }, currency_version: 1 }]);
      await tx.$executeRawUnsafe('INSERT INTO transfer_requests(response) VALUES (NULL)');
      expect(await tx.$queryRawUnsafe('SELECT currency_version FROM transfer_requests WHERE response IS NULL')).toEqual([{ currency_version: 2 }]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    });
  } finally { await prisma.$disconnect(); }
});
