import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(testDir, '..');
const projectRoot = path.resolve(backendRoot, '..');
const testDbFile = path.join(backendRoot, 'data', 'test-loja-rpg.sqlite');

process.env.NODE_ENV = 'test';
process.env.DB_FILE = testDbFile;
process.env.DATABASE_URL = 'file:../data/test-loja-rpg.sqlite';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.CORS_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173';
process.env.MASTER_REGISTRATION_KEY = 'test-master-key';

let app;
let closeDatabase;
let getDatabase;
let initializeSchema;

function deleteTestDatabase() {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = `${testDbFile}${suffix}`;

    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
    }
  }
}

async function seedTestDatabase() {
  await closeDatabase();
  deleteTestDatabase();
  initializeSchema();
  const seedSql = fs.readFileSync(path.join(projectRoot, 'database', 'seed.sql'), 'utf8');
  getDatabase().exec(seedSql);
  await closeDatabase();
}

async function login(email, password = 'jogador123') {
  const response = await request(app).post('/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token;
}

beforeAll(async () => {
  ({ closeDatabase, getDatabase } = await import('../src/database/connection.js'));
  ({ initializeSchema } = await import('../src/database/schema.js'));
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(async () => {
  await seedTestDatabase();
});

afterAll(async () => {
  await closeDatabase();
  deleteTestDatabase();
});

describe('autenticacao e autorizacao', () => {
  it('realiza login e retorna usuario e token', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'mestre@lojarpg.local', password: 'mestre123' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: 'mestre@lojarpg.local',
      role: 'MESTRE'
    });
  });

  it('renova access token com refresh token e revoga no logout', async () => {
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'aria@lojarpg.local', password: 'jogador123' });

    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));

    const logoutResponse = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: refreshResponse.body.refreshToken });

    expect(logoutResponse.status).toBe(200);

    const revokedRefreshResponse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: refreshResponse.body.refreshToken });

    expect(revokedRefreshResponse.status).toBe(401);
  });

  it('bloqueia rotas protegidas sem token', async () => {
    const response = await request(app).get('/items');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Token');
  });

  it('impede jogador de criar itens', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        name: 'Tocha Azul',
        category: 'Equipamentos',
        description: 'Queima com chama fria.',
        price: 15,
        rarity: 'Comum',
        stock: 5
      });

    expect(response.status).toBe(403);
  });

  it('impede jogador de alterar ouro diretamente', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .patch('/characters/1/gold')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ amount: 100, mode: 'adjust', reason: 'Teste indevido' });

    expect(response.status).toBe(403);
  });

  it('registra auditoria quando Mestre altera ouro', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const response = await request(app)
      .patch('/characters/1/gold')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ amount: 25, mode: 'adjust', reason: 'Recompensa de sessao' });

    expect(response.status).toBe(200);
    expect(response.body.character.gold).toBe(275);
    expect(response.body.auditLog).toMatchObject({
      previousGold: 250,
      newGold: 275,
      delta: 25,
      reason: 'Recompensa de sessao'
    });

    const auditResponse = await request(app)
      .get('/characters/gold-audit')
      .set('Authorization', `Bearer ${masterToken}`);

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.logs).toHaveLength(1);
  });
});

describe('itens', () => {
  it('permite CRUD de itens para o Mestre', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const createResponse = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({
        name: 'Mapa do Tesouro',
        category: 'Equipamentos',
        description: 'Mostra uma trilha antiga.',
        price: 40,
        rarity: 'Incomum',
        stock: 2
      });

    expect(createResponse.status).toBe(201);
    const itemId = createResponse.body.item.id;

    const updateResponse = await request(app)
      .put(`/items/${itemId}`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ price: 55, stock: 3 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.item).toMatchObject({ price: 55, stock: 3 });

    const deleteResponse = await request(app)
      .delete(`/items/${itemId}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.item.isActive).toBe(false);
  });
});

describe('catalogo', () => {
  it('remove categoria usada realocando itens para Sem categoria', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const categoriesResponse = await request(app)
      .get('/catalog/categories')
      .set('Authorization', `Bearer ${masterToken}`);
    const weaponsCategory = categoriesResponse.body.categories.find((category) => category.name === 'Armas');

    expect(weaponsCategory.itemCount).toBeGreaterThan(0);

    const deleteResponse = await request(app)
      .delete(`/catalog/categories/${weaponsCategory.id}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toContain('Sem categoria');
    expect(deleteResponse.body.movedItems).toBeGreaterThan(0);

    const itemsResponse = await request(app)
      .get('/items?includeInactive=true')
      .set('Authorization', `Bearer ${masterToken}`);
    const sword = itemsResponse.body.items.find((item) => item.name === 'Espada Longa');

    expect(sword.category).toBe('Sem categoria');
  });

  it('remove raridade usada realocando itens para Comum', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const raritiesResponse = await request(app)
      .get('/catalog/rarities')
      .set('Authorization', `Bearer ${masterToken}`);
    const rareRarity = raritiesResponse.body.rarities.find((rarity) => rarity.name === 'Raro');

    expect(rareRarity.itemCount).toBeGreaterThan(0);

    const deleteResponse = await request(app)
      .delete(`/catalog/rarities/${rareRarity.id}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toContain('Comum');
    expect(deleteResponse.body.movedItems).toBeGreaterThan(0);

    const itemsResponse = await request(app)
      .get('/items?includeInactive=true')
      .set('Authorization', `Bearer ${masterToken}`);
    const invisibilityPotion = itemsResponse.body.items.find((item) => item.name === 'Pocao de Invisibilidade');

    expect(invisibilityPotion.rarity).toBe('Comum');
  });
});

describe('compras e inventario', () => {
  it('recusa compra sem ouro suficiente', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post('/purchases')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 7, quantity: 2 }] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Ouro insuficiente');
  });

  it('recusa compra sem estoque suficiente', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post('/purchases')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 9, quantity: 2 }] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Estoque insuficiente');
  });

  it('atualiza ouro, estoque, inventario e historico apos compra', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const purchaseResponse = await request(app)
      .post('/purchases')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 6, quantity: 1 }] });

    expect(purchaseResponse.status).toBe(201);
    expect(purchaseResponse.body.character.gold).toBe(200);

    const inventoryResponse = await request(app)
      .get('/inventory/me')
      .set('Authorization', `Bearer ${playerToken}`);

    expect(inventoryResponse.status).toBe(200);
    expect(inventoryResponse.body.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 1,
          item: expect.objectContaining({ name: 'Pocao de Cura' })
        })
      ])
    );

    const historyResponse = await request(app)
      .get('/purchases/me')
      .set('Authorization', `Bearer ${playerToken}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.purchases).toHaveLength(1);
  });
});
