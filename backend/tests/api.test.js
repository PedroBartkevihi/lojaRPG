import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../prisma/seed.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(testDir, '..');
const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js');

dotenv.config({ path: path.join(backendRoot, '.env') });

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL || 'postgresql://lojarpg:lojarpg@127.0.0.1:5432/lojarpg_test';

// Os testes apagam os dados a cada caso; a trava evita apontar sem querer
// para o banco de desenvolvimento ou de producao.
if (!new URL(testDatabaseUrl).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL precisa apontar para um banco cujo nome termina em _test.');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.CORS_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173';
process.env.MASTER_REGISTRATION_KEY = 'test-master-key';

let app;
let closeDatabase;
let getPrisma;

const tokenCache = new Map();

// O seed recria sempre os mesmos usuarios, entao o token continua valido entre
// testes; reaproveita-lo evita esbarrar no rate limit das rotas de autenticacao.
async function login(email, password = 'jogador123') {
  if (!tokenCache.has(email)) {
    const response = await request(app).post('/auth/login').send({ email, password });
    expect(response.status).toBe(200);
    tokenCache.set(email, response.body.token);
  }

  return tokenCache.get(email);
}

beforeAll(async () => {
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: backendRoot, stdio: 'pipe' });
  ({ closeDatabase, getPrisma } = await import('../src/database/connection.js'));
  ({ default: app } = await import('../src/app.js'));
}, 60000);

beforeEach(async () => {
  await seed(getPrisma());
});

afterAll(async () => {
  await closeDatabase();
});

describe('validacao das entradas', () => {
  it('recusa cadastro com email invalido ou personagem incompleto', async () => {
    const invalidEmail = await request(app).post('/auth/register').send({
      name: 'Teste',
      email: 'sem-arroba',
      password: 'segredo1'
    });

    expect(invalidEmail.status).toBe(400);
    expect(invalidEmail.body.message).toBe('Email invalido.');

    const missingClass = await request(app)
      .post('/auth/register')
      .send({
        name: 'Teste',
        email: 'teste@lojarpg.local',
        password: 'segredo1',
        character: { name: 'Heroi', race: 'Humano' }
      });

    expect(missingClass.status).toBe(400);
    expect(missingClass.body.message).toBe('Classe e obrigatorio.');
  });

  it('recusa carrinho vazio ou com quantidade invalida', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const emptyCart = await request(app)
      .post('/purchases')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [] });

    expect(emptyCart.status).toBe(400);
    expect(emptyCart.body.message).toBe('Carrinho vazio.');

    const zeroQuantity = await request(app)
      .post('/purchases')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 6, quantity: 0 }] });

    expect(zeroQuantity.status).toBe(400);
    expect(zeroQuantity.body.message).toBe('Itens do carrinho invalidos.');
  });

  it('responde 400 para id de personagem que nao e numero', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .get('/purchases/me?characterId=abc')
      .set('Authorization', `Bearer ${playerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Id do personagem');
  });

  it('edita so os campos enviados e valida o que chegou', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const partialUpdate = await request(app)
      .put('/items/1')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ description: 'Forjada por anoes.' });

    expect(partialUpdate.status).toBe(200);
    expect(partialUpdate.body.item).toMatchObject({
      name: 'Espada Longa',
      price: 75,
      stock: 5,
      description: 'Forjada por anoes.'
    });

    const invalidPrice = await request(app)
      .put('/items/1')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ price: -10 });

    expect(invalidPrice.status).toBe(400);
    expect(invalidPrice.body.message).toBe('Preco deve ser um numero inteiro entre 0 e 1000000.');
  });
});

describe('integridade do banco', () => {
  it('recusa ouro, estoque e nivel invalidos mesmo fora da API', async () => {
    const prisma = getPrisma();

    await expect(prisma.character.update({ where: { id: 1 }, data: { gold: -1 } })).rejects.toThrow(
      /violates check constraint/
    );
    await expect(prisma.character.update({ where: { id: 1 }, data: { level: 21 } })).rejects.toThrow(
      /violates check constraint/
    );
    await expect(prisma.item.update({ where: { id: 1 }, data: { stock: -1 } })).rejects.toThrow(
      /violates check constraint/
    );
  });
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

  it('nao vende alem do estoque com compras simultaneas', async () => {
    const tokens = await Promise.all(
      ['aria@lojarpg.local', 'borin@lojarpg.local', 'lia@lojarpg.local'].map((email) => login(email))
    );

    const responses = await Promise.all(
      tokens.map((token) =>
        request(app)
          .post('/purchases')
          .set('Authorization', `Bearer ${token}`)
          .send({ items: [{ itemId: 8, quantity: 1 }] })
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 201, 400]);
    expect(responses.find((response) => response.status === 400).body.message).toContain('Estoque insuficiente');

    const scroll = await getPrisma().item.findUnique({ where: { id: 8 } });
    expect(scroll.stock).toBe(0);
  });

  it('nao gasta o mesmo ouro duas vezes com compras simultaneas', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post('/purchases')
          .set('Authorization', `Bearer ${playerToken}`)
          .send({ items: [{ itemId: 7, quantity: 1 }] })
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);
    expect(responses.find((response) => response.status === 400).body.message).toContain('Ouro insuficiente');

    const aria = await getPrisma().character.findUnique({ where: { id: 1 } });
    expect(aria.gold).toBe(30);
  });

  it('nao perde a compra quando o Mestre ajusta o ouro ao mesmo tempo', async () => {
    const [playerToken, masterToken] = [
      await login('aria@lojarpg.local'),
      await login('mestre@lojarpg.local', 'mestre123')
    ];

    const [purchaseResponse, goldResponse] = await Promise.all([
      request(app)
        .post('/purchases')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ items: [{ itemId: 7, quantity: 1 }] }),
      request(app)
        .patch('/characters/1/gold')
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ amount: 25, mode: 'adjust', reason: 'Recompensa de sessao' })
    ]);

    // O ajuste entra antes ou depois da compra, ou e recusado (409) porque o
    // ouro mudou no meio; em nenhum caso a compra deixa de ser cobrada.
    expect(purchaseResponse.status).toBe(201);
    expect([200, 409]).toContain(goldResponse.status);

    const aria = await getPrisma().character.findUnique({ where: { id: 1 } });

    if (goldResponse.status === 200) {
      expect(goldResponse.body.auditLog.delta).toBe(25);
      expect(aria.gold).toBe(250 - 220 + 25);
    } else {
      expect(aria.gold).toBe(250 - 220);
    }
  });

  it('nao desfaz a compra quando o Mestre edita o item ao mesmo tempo', async () => {
    const [playerToken, masterToken] = [
      await login('borin@lojarpg.local'),
      await login('mestre@lojarpg.local', 'mestre123')
    ];

    const [purchaseResponse, editResponse] = await Promise.all([
      request(app)
        .post('/purchases')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ items: [{ itemId: 8, quantity: 1 }] }),
      request(app)
        .put('/items/8')
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ price: 200 })
    ]);

    expect(purchaseResponse.status).toBe(201);
    expect([200, 409]).toContain(editResponse.status);

    const scroll = await getPrisma().item.findUnique({ where: { id: 8 } });
    const movements = await getPrisma().stockMovement.findMany({ where: { itemId: 8 } });

    expect(scroll.stock).toBe(1);
    expect(movements.reduce((total, movement) => total + movement.delta, 0)).toBe(scroll.stock - 2);
  });
});
