import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDemo, seed } from '../prisma/seed.js';

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
// Como no Render: a API fica atras de proxy e le o IP do X-Forwarded-For.
process.env.TRUST_PROXY = '1';

// Mesa de demonstracao do seed: Mestre do Cofre e os jogadores Aria, Borin e Lia.
const DEMO = '/campaigns/1';

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

function as(token) {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
    put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
    patch: (url, body) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
  };
}

async function createCampaign(token, name = 'Mesa do Borin') {
  const response = await as(token).post('/campaigns', { name });
  expect(response.status).toBe(201);
  return response.body.campaign;
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
  it('recusa cadastro com email invalido ou sem nome', async () => {
    const invalidEmail = await request(app).post('/auth/register').send({
      name: 'Teste',
      email: 'sem-arroba',
      password: 'segredo1'
    });

    expect(invalidEmail.status).toBe(400);
    expect(invalidEmail.body.message).toBe('Email invalido.');

    const missingName = await request(app).post('/auth/register').send({
      name: '  ',
      email: 'teste@lojarpg.local',
      password: 'segredo1'
    });

    expect(missingName.status).toBe(400);
    expect(missingName.body.message).toBe('Nome e obrigatorio.');
  });

  it('recusa personagem incompleto', async () => {
    const playerToken = await login('lia@lojarpg.local');

    const response = await as(playerToken).post(`${DEMO}/characters`, { name: 'Heroi', race: 'Humano', level: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Classe e obrigatorio.');
  });

  it('recusa carrinho vazio ou com quantidade invalida', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const emptyCart = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [] });

    expect(emptyCart.status).toBe(400);
    expect(emptyCart.body.message).toBe('Carrinho vazio.');

    const zeroQuantity = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 6, quantity: 0 }] });

    expect(zeroQuantity.status).toBe(400);
    expect(zeroQuantity.body.message).toBe('Itens do carrinho invalidos.');
  });

  it('responde 400 para id de personagem que nao e numero', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .get(`${DEMO}/purchases/me?characterId=abc`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Id do personagem');
  });

  it('edita so os campos enviados e valida o que chegou', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const partialUpdate = await request(app)
      .put(`${DEMO}/items/1`)
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
      .put(`${DEMO}/items/1`)
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
    expect(response.body.user).toMatchObject({ email: 'mestre@lojarpg.local' });
    expect(response.body.user).not.toHaveProperty('role');
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

  it('separa o rate limit por usuario atras de proxy', async () => {
    const attempt = (ip) =>
      request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'ninguem@lojarpg.local', password: 'errada1' });

    for (let index = 0; index < 20; index += 1) {
      expect((await attempt('203.0.113.10')).status).toBe(401);
    }

    expect((await attempt('203.0.113.10')).status).toBe(429);
    expect((await attempt('203.0.113.20')).status).toBe(401);
  });

  it('bloqueia rotas protegidas sem token', async () => {
    const response = await request(app).get(`${DEMO}/items`);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Token');
  });

  it('impede jogador de criar itens', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post(`${DEMO}/items`)
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
      .patch(`${DEMO}/characters/1/gold`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ amount: 100, mode: 'adjust', reason: 'Teste indevido' });

    expect(response.status).toBe(403);
  });

  it('registra auditoria quando Mestre altera ouro', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const response = await request(app)
      .patch(`${DEMO}/characters/1/gold`)
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
      .get(`${DEMO}/characters/gold-audit`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.logs).toHaveLength(1);
  });
});

describe('itens', () => {
  it('permite CRUD de itens para o Mestre', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const createResponse = await request(app)
      .post(`${DEMO}/items`)
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
      .put(`${DEMO}/items/${itemId}`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ price: 55, stock: 3 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.item).toMatchObject({ price: 55, stock: 3 });

    const deleteResponse = await request(app)
      .delete(`${DEMO}/items/${itemId}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.item.isActive).toBe(false);
  });
});

describe('catalogo', () => {
  it('remove categoria usada realocando itens para Sem categoria', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const categoriesResponse = await request(app)
      .get(`${DEMO}/catalog/categories`)
      .set('Authorization', `Bearer ${masterToken}`);
    const weaponsCategory = categoriesResponse.body.categories.find((category) => category.name === 'Armas');

    expect(weaponsCategory.itemCount).toBeGreaterThan(0);

    const deleteResponse = await request(app)
      .delete(`${DEMO}/catalog/categories/${weaponsCategory.id}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toContain('Sem categoria');
    expect(deleteResponse.body.movedItems).toBeGreaterThan(0);

    const itemsResponse = await request(app)
      .get(`${DEMO}/items?includeInactive=true`)
      .set('Authorization', `Bearer ${masterToken}`);
    const sword = itemsResponse.body.items.find((item) => item.name === 'Espada Longa');

    expect(sword.category).toBe('Sem categoria');
  });

  it('remove raridade usada realocando itens para Comum', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const raritiesResponse = await request(app)
      .get(`${DEMO}/catalog/rarities`)
      .set('Authorization', `Bearer ${masterToken}`);
    const rareRarity = raritiesResponse.body.rarities.find((rarity) => rarity.name === 'Raro');

    expect(rareRarity.itemCount).toBeGreaterThan(0);

    const deleteResponse = await request(app)
      .delete(`${DEMO}/catalog/rarities/${rareRarity.id}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.message).toContain('Comum');
    expect(deleteResponse.body.movedItems).toBeGreaterThan(0);

    const itemsResponse = await request(app)
      .get(`${DEMO}/items?includeInactive=true`)
      .set('Authorization', `Bearer ${masterToken}`);
    const invisibilityPotion = itemsResponse.body.items.find((item) => item.name === 'Pocao de Invisibilidade');

    expect(invisibilityPotion.rarity).toBe('Comum');
  });
});

describe('compras e inventario', () => {
  it('recusa compra sem ouro suficiente', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 7, quantity: 2 }] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Ouro insuficiente');
  });

  it('recusa compra sem estoque suficiente', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 9, quantity: 2 }] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Estoque insuficiente');
  });

  it('atualiza ouro, estoque, inventario e historico apos compra', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const purchaseResponse = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ items: [{ itemId: 6, quantity: 1 }] });

    expect(purchaseResponse.status).toBe(201);
    expect(purchaseResponse.body.character.gold).toBe(200);

    const inventoryResponse = await request(app)
      .get(`${DEMO}/inventory/me`)
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
      .get(`${DEMO}/purchases/me`)
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
          .post(`${DEMO}/purchases`)
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
          .post(`${DEMO}/purchases`)
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
        .post(`${DEMO}/purchases`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ items: [{ itemId: 7, quantity: 1 }] }),
      request(app)
        .patch(`${DEMO}/characters/1/gold`)
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
        .post(`${DEMO}/purchases`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ items: [{ itemId: 8, quantity: 1 }] }),
      request(app)
        .put(`${DEMO}/items/8`)
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

describe('mesas', () => {
  it('cria conta sem papel e a mesa nova ja vem com o catalogo inicial', async () => {
    const register = await request(app).post('/auth/register').send({
      name: 'Pedro',
      email: 'pedro@exemplo.com',
      password: 'segredo1',
      role: 'MESTRE'
    });

    expect(register.status).toBe(201);
    expect(register.body.user).not.toHaveProperty('role');

    const pedro = as(register.body.token);
    expect((await pedro.get('/campaigns')).body.campaigns).toEqual([]);

    const campaign = await createCampaign(register.body.token, 'Mesa do Pedro');

    expect(campaign).toMatchObject({ name: 'Mesa do Pedro', role: 'MESTRE', memberCount: 1 });
    expect(campaign.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    const items = await pedro.get(`/campaigns/${campaign.id}/items`);
    const categories = await pedro.get(`/campaigns/${campaign.id}/catalog/categories`);

    expect(items.body.items).toHaveLength(10);
    expect(items.body.items.every((item) => item.campaignId === campaign.id)).toBe(true);
    expect(categories.body.categories.map((category) => category.name)).toContain('Armas');
    expect((await pedro.get('/campaigns')).body.campaigns).toEqual([expect.objectContaining({ id: campaign.id })]);
  });

  it('a mesma conta e jogador numa mesa e Mestre em outra', async () => {
    const borinToken = await login('borin@lojarpg.local');
    const campaign = await createCampaign(borinToken);

    const list = await as(borinToken).get('/campaigns');

    expect(list.body.campaigns).toEqual([
      expect.objectContaining({ id: 1, role: 'JOGADOR' }),
      expect.objectContaining({ id: campaign.id, role: 'MESTRE' })
    ]);
    expect(list.body.campaigns[0]).not.toHaveProperty('inviteCode');

    const createInDemo = await as(borinToken).post(`${DEMO}/items`, {
      name: 'Tocha',
      category: 'Equipamentos',
      price: 1,
      rarity: 'Comum',
      stock: 1
    });
    expect(createInDemo.status).toBe(403);

    const createInOwn = await as(borinToken).post(`/campaigns/${campaign.id}/items`, {
      name: 'Tocha',
      category: 'Equipamentos',
      price: 1,
      rarity: 'Comum',
      stock: 1
    });
    expect(createInOwn.status).toBe(201);
  });

  it('jogador entra pelo codigo de convite e cria personagem na mesa', async () => {
    const [borinToken, liaToken] = [await login('borin@lojarpg.local'), await login('lia@lojarpg.local')];
    const campaign = await createCampaign(borinToken);
    const typedCode = `${campaign.inviteCode.slice(0, 4)}-${campaign.inviteCode.slice(4)}`.toLowerCase();

    const join = await as(liaToken).post('/campaigns/join', { inviteCode: typedCode });

    expect(join.status).toBe(201);
    expect(join.body.campaign).toMatchObject({ id: campaign.id, role: 'JOGADOR', memberCount: 2 });
    expect(join.body.campaign).not.toHaveProperty('inviteCode');

    const joinAgain = await as(liaToken).post('/campaigns/join', { inviteCode: campaign.inviteCode });
    expect(joinAgain.status).toBe(200);
    expect(joinAgain.body.message).toContain('ja participa');

    const wrongCode = await as(liaToken).post('/campaigns/join', { inviteCode: 'ZZZZZZZZ' });
    expect(wrongCode.status).toBe(404);
    expect(wrongCode.body.message).toBe('Codigo de convite invalido.');

    const malformedCode = await as(liaToken).post('/campaigns/join', { inviteCode: 'ABC' });
    expect(malformedCode.status).toBe(400);

    const lia = as(liaToken);
    expect((await lia.get(`/campaigns/${campaign.id}/characters/me`)).body.characters).toEqual([]);

    const character = await lia.post(`/campaigns/${campaign.id}/characters`, {
      name: 'Lia Sombra',
      className: 'Bruxa',
      race: 'Tiefling',
      level: 2
    });
    expect(character.status).toBe(201);
    expect(character.body.character).toMatchObject({ campaignId: campaign.id, gold: 0 });

    const masterView = await as(borinToken).get(`/campaigns/${campaign.id}/characters`);
    expect(masterView.body.characters.map((entry) => entry.name)).toEqual(['Lia Sombra']);

    const details = await lia.get(`/campaigns/${campaign.id}`);
    expect(details.body.members).toEqual([
      expect.objectContaining({ name: 'Borin', role: 'MESTRE', characters: [] }),
      expect.objectContaining({
        name: 'Lia',
        role: 'JOGADOR',
        characters: [expect.objectContaining({ name: 'Lia Sombra', className: 'Bruxa' })]
      })
    ]);
  });

  it('uma mesa nao ve nem altera itens, personagens e catalogo de outra', async () => {
    const [borinToken, masterToken, ariaToken] = [
      await login('borin@lojarpg.local'),
      await login('mestre@lojarpg.local', 'mestre123'),
      await login('aria@lojarpg.local')
    ];
    const campaign = await createCampaign(borinToken);
    const borin = as(borinToken);
    const ownItems = (await borin.get(`/campaigns/${campaign.id}/items`)).body.items;

    const outsider = await as(masterToken).get(`/campaigns/${campaign.id}/items`);
    expect(outsider.status).toBe(404);
    expect(outsider.body.message).toBe('Mesa nao encontrada.');

    const foreignGold = await borin.patch(`/campaigns/${campaign.id}/characters/1/gold`, {
      amount: 1000,
      mode: 'adjust',
      reason: 'Tentativa entre mesas'
    });
    expect(foreignGold.status).toBe(404);

    const foreignItem = await borin.put(`/campaigns/${campaign.id}/items/1`, { price: 1 });
    expect(foreignItem.status).toBe(404);

    const foreignCategory = await borin.delete(`/campaigns/${campaign.id}/catalog/categories/1`);
    expect(foreignCategory.status).toBe(404);
    expect(foreignCategory.body.message).toBe('Categoria nao encontrada.');

    const crossPurchase = await as(ariaToken).post(`${DEMO}/purchases`, {
      items: [{ itemId: ownItems[0].id, quantity: 1 }]
    });
    expect(crossPurchase.status).toBe(404);

    const newItem = await borin.post(`/campaigns/${campaign.id}/items`, {
      name: 'Machado Runico',
      category: 'Armas',
      price: 120,
      rarity: 'Raro',
      stock: 1
    });
    expect(newItem.status).toBe(201);
    expect(newItem.body.item.categoryId).not.toBe(1);

    const demoItems = await as(ariaToken).get(`${DEMO}/items?search=Machado`);
    expect(demoItems.body.items).toEqual([]);

    const prisma = getPrisma();
    expect(await prisma.character.findUnique({ where: { id: 1 } })).toMatchObject({ gold: 250 });
    expect(await prisma.item.findUnique({ where: { id: 1 } })).toMatchObject({ price: 75 });
  });

  it('Mestre troca o codigo, remove jogador e ele volta com os personagens', async () => {
    const [borinToken, liaToken] = [await login('borin@lojarpg.local'), await login('lia@lojarpg.local')];
    const campaign = await createCampaign(borinToken);
    const [borin, lia] = [as(borinToken), as(liaToken)];
    const base = `/campaigns/${campaign.id}`;

    await lia.post('/campaigns/join', { inviteCode: campaign.inviteCode });
    await lia.post(`${base}/characters`, { name: 'Lia Sombra', className: 'Bruxa', race: 'Tiefling', level: 2 });

    const playerRegenerate = await lia.post(`${base}/invite-code`);
    expect(playerRegenerate.status).toBe(403);

    const regenerated = await borin.post(`${base}/invite-code`);
    expect(regenerated.status).toBe(200);
    expect(regenerated.body.campaign.inviteCode).not.toBe(campaign.inviteCode);

    const playerRemovesMaster = await lia.delete(`${base}/members/3`);
    expect(playerRemovesMaster.status).toBe(403);

    const masterLeaves = await borin.delete(`${base}/members/3`);
    expect(masterLeaves.status).toBe(400);

    const removed = await borin.delete(`${base}/members/4`);
    expect(removed.status).toBe(200);
    expect((await lia.get(`${base}/items`)).status).toBe(404);
    expect((await borin.get(`${base}/characters`)).body.characters).toEqual([]);

    const oldCode = await lia.post('/campaigns/join', { inviteCode: campaign.inviteCode });
    expect(oldCode.status).toBe(404);

    const rejoin = await lia.post('/campaigns/join', { inviteCode: regenerated.body.campaign.inviteCode });
    expect(rejoin.status).toBe(201);
    expect((await lia.get(`${base}/characters/me`)).body.characters).toEqual([
      expect.objectContaining({ name: 'Lia Sombra' })
    ]);

    const leave = await lia.delete(`${base}/members/4`);
    expect(leave.status).toBe(200);
    expect(leave.body.message).toContain('Voce saiu');
  });

  it('Mestre exclui a mesa mesmo com compras e inventario', async () => {
    const [borinToken, liaToken] = [await login('borin@lojarpg.local'), await login('lia@lojarpg.local')];
    const campaign = await createCampaign(borinToken);
    const [borin, lia] = [as(borinToken), as(liaToken)];
    const base = `/campaigns/${campaign.id}`;

    await lia.post('/campaigns/join', { inviteCode: campaign.inviteCode });
    const character = (
      await lia.post(`${base}/characters`, { name: 'Lia Sombra', className: 'Bruxa', race: 'Tiefling', level: 2 })
    ).body.character;
    await borin.patch(`${base}/characters/${character.id}/gold`, { amount: 100, mode: 'adjust', reason: 'Inicio' });
    const potion = (await lia.get(`${base}/items?search=Cura`)).body.items[0];

    const purchase = await lia.post(`${base}/purchases`, {
      characterId: character.id,
      items: [{ itemId: potion.id, quantity: 2 }]
    });
    expect(purchase.status).toBe(201);

    const sale = await lia.post(`${base}/inventory/${character.id}/sell`, { itemId: potion.id, quantity: 1 });
    expect(sale.status).toBe(200);

    expect((await lia.delete(base)).status).toBe(403);

    const removed = await borin.delete(base);
    expect(removed.status).toBe(200);
    expect((await lia.get('/campaigns')).body.campaigns.map((entry) => entry.id)).toEqual([1]);

    const prisma = getPrisma();
    expect(await prisma.item.count({ where: { campaignId: campaign.id } })).toBe(0);
    expect(await prisma.character.count({ where: { campaignId: campaign.id } })).toBe(0);
    expect(await prisma.item.count({ where: { campaignId: 1 } })).toBe(10);
  });

  it('o reset da demonstracao preserva as mesas reais', async () => {
    const register = await request(app).post('/auth/register').send({
      name: 'Pedro',
      email: 'pedro@exemplo.com',
      password: 'segredo1'
    });
    const realCampaign = await createCampaign(register.body.token, 'Mesa do Pedro');
    const ariaToken = await login('aria@lojarpg.local');
    const ariaCampaign = await createCampaign(ariaToken, 'Mesa criada na demo');

    await as(ariaToken).post('/campaigns/join', { inviteCode: realCampaign.inviteCode });
    await as(ariaToken).post(`${DEMO}/purchases`, { items: [{ itemId: 6, quantity: 1 }] });

    await resetDemo(getPrisma());

    const prisma = getPrisma();
    const campaigns = await prisma.campaign.findMany({ orderBy: { id: 'asc' } });

    expect(campaigns.map((campaign) => campaign.name)).toEqual(['Mesa de demonstracao', 'Mesa do Pedro']);
    expect(campaigns.some((campaign) => campaign.id === ariaCampaign.id)).toBe(false);
    expect(await prisma.campaignMember.findMany({ where: { campaignId: realCampaign.id } })).toEqual([
      expect.objectContaining({ userId: register.body.user.id, role: 'MESTRE' })
    ]);
    expect(await prisma.item.count({ where: { campaignId: realCampaign.id } })).toBe(10);
    expect(await prisma.character.findUnique({ where: { id: 1 } })).toMatchObject({ gold: 250 });
    expect(await prisma.purchase.count()).toBe(0);

    const newUser = await prisma.user.create({
      data: { name: 'Depois do reset', email: 'depois@exemplo.com', passwordHash: 'x' }
    });
    expect(newUser.id).toBeGreaterThan(register.body.user.id);
  });
});

describe('inventario e recompensas', () => {
  it('vende pela metade do preco, paga o personagem e devolve o item ao estoque', async () => {
    const borin = as(await login('borin@lojarpg.local'));

    const sale = await borin.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 });

    expect(sale.status).toBe(200);
    expect(sale.body.message).toBe('Venda concluida: 1x Pocao de Cura por 25 ouro.');
    expect(sale.body.character.gold).toBe(345);

    const inventory = await borin.get(`${DEMO}/inventory/me`);
    expect(inventory.body.inventory).toEqual([
      expect.objectContaining({ quantity: 1, item: expect.objectContaining({ name: 'Pocao de Cura', effectiveSellPrice: 25 }) })
    ]);
    expect(inventory.body.logs).toEqual([
      expect.objectContaining({ type: 'VENDA', itemName: 'Pocao de Cura', quantity: 1, unitPrice: 25, total: 25 })
    ]);

    const prisma = getPrisma();
    expect(await prisma.item.findUnique({ where: { id: 6 } })).toMatchObject({ stock: 13 });
    expect(await prisma.stockMovement.findFirst({ where: { itemId: 6 } })).toMatchObject({
      previousStock: 12,
      newStock: 13,
      reason: 'Venda de Borin Escudoforte'
    });
  });

  it('usa o preco de venda do Mestre e recusa o que a loja nao compra', async () => {
    const [master, borin] = [as(await login('mestre@lojarpg.local', 'mestre123')), as(await login('borin@lojarpg.local'))];

    const items = (await master.get(`${DEMO}/items`)).body.items;
    expect(items.find((item) => item.name === 'Espada Longa')).toMatchObject({ sellPrice: null, effectiveSellPrice: 37 });

    const custom = await master.put(`${DEMO}/items/6`, { sellPrice: 40 });
    expect(custom.body.item).toMatchObject({ sellPrice: 40, effectiveSellPrice: 40 });
    expect((await borin.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 })).body.character.gold).toBe(360);

    const reset = await master.put(`${DEMO}/items/6`, { sellPrice: '' });
    expect(reset.body.item).toMatchObject({ sellPrice: null, effectiveSellPrice: 25 });

    const unsellable = await master.put(`${DEMO}/items/6`, { isSellable: false });
    expect(unsellable.body.item).toMatchObject({ isSellable: false, effectiveSellPrice: null });

    const priceOnly = await master.put(`${DEMO}/items/6`, { price: 60 });
    expect(priceOnly.body.item).toMatchObject({ price: 60, isSellable: false });

    const refused = await borin.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toBe('A loja nao compra Pocao de Cura.');

    const invalidPrice = await master.put(`${DEMO}/items/6`, { sellPrice: -5 });
    expect(invalidPrice.status).toBe(400);
  });

  it('nao vende o que o personagem nao tem nem itens de outro jogador', async () => {
    const [aria, master] = [as(await login('aria@lojarpg.local')), as(await login('mestre@lojarpg.local', 'mestre123'))];

    const missing = await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 6, quantity: 1 });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('Quantidade insuficiente de Pocao de Cura no inventario.');

    const tooMany = await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 10, quantity: 2 });
    expect(tooMany.status).toBe(400);

    expect((await aria.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 })).status).toBe(403);
    expect((await master.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 })).status).toBe(403);
    expect((await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 10, quantity: 0 })).status).toBe(400);
  });

  it('vendas simultaneas do ultimo item pagam uma vez so', async () => {
    const aria = as(await login('aria@lojarpg.local'));

    const responses = await Promise.all(
      [1, 2].map(() => aria.post(`${DEMO}/inventory/1/sell`, { itemId: 10, quantity: 1 }))
    );

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);

    const prisma = getPrisma();
    expect(await prisma.character.findUnique({ where: { id: 1 } })).toMatchObject({ gold: 267 });
    expect(await prisma.inventory.count({ where: { characterId: 1 } })).toBe(0);
    expect(await prisma.item.findUnique({ where: { id: 10 } })).toMatchObject({ stock: 9 });
  });

  it('usa item, tira do inventario e registra no historico', async () => {
    const borin = as(await login('borin@lojarpg.local'));

    const used = await borin.post(`${DEMO}/inventory/2/use`, { itemId: 6, quantity: 1, reason: 'Curou a Lia' });
    expect(used.status).toBe(200);
    expect(used.body.message).toBe('Item usado: 1x Pocao de Cura.');

    const tooMany = await borin.post(`${DEMO}/inventory/2/use`, { itemId: 6, quantity: 2 });
    expect(tooMany.status).toBe(400);

    const inventory = await borin.get(`${DEMO}/inventory/me`);
    expect(inventory.body.inventory).toEqual([expect.objectContaining({ quantity: 1 })]);
    expect(inventory.body.logs).toEqual([
      expect.objectContaining({ type: 'USO', quantity: 1, reason: 'Curou a Lia', actorName: 'Borin' })
    ]);
    expect(await getPrisma().item.findUnique({ where: { id: 6 } })).toMatchObject({ stock: 12 });
  });

  it('Mestre divide ouro entre o grupo, informa a sobra e audita cada parte', async () => {
    const [master, aria] = [as(await login('mestre@lojarpg.local', 'mestre123')), as(await login('aria@lojarpg.local'))];

    const split = await master.post(`${DEMO}/rewards/gold`, {
      characterIds: [1, 2, 3],
      total: 100,
      mode: 'split',
      reason: 'Tesouro do dragao'
    });

    expect(split.status).toBe(200);
    expect(split.body).toMatchObject({ share: 33, remainder: 1 });
    expect(split.body.message).toContain('Sobrou 1.');
    expect(split.body.characters.map((character) => character.gold)).toEqual([283, 353, 213]);

    const audit = (await master.get(`${DEMO}/characters/gold-audit`)).body.logs;
    expect(audit).toHaveLength(3);
    expect(audit.every((log) => log.delta === 33 && log.reason === 'Tesouro do dragao')).toBe(true);

    const each = await master.post(`${DEMO}/rewards/gold`, {
      characterIds: [1, 2],
      total: 10,
      mode: 'each',
      reason: 'Missao concluida'
    });
    expect(each.body.characters.map((character) => character.gold)).toEqual([293, 363]);

    const tooSmall = await master.post(`${DEMO}/rewards/gold`, {
      characterIds: [1, 2, 3],
      total: 2,
      mode: 'split',
      reason: 'Moedas'
    });
    expect(tooSmall.status).toBe(400);

    const withoutReason = await master.post(`${DEMO}/rewards/gold`, { characterIds: [1], total: 5, mode: 'each' });
    expect(withoutReason.status).toBe(400);

    const byPlayer = await aria.post(`${DEMO}/rewards/gold`, {
      characterIds: [1],
      total: 1000,
      mode: 'each',
      reason: 'Trapaca'
    });
    expect(byPlayer.status).toBe(403);
  });

  it('Mestre nao da ouro a personagem de outra mesa', async () => {
    const [borinToken, liaToken] = [await login('borin@lojarpg.local'), await login('lia@lojarpg.local')];
    const campaign = await createCampaign(borinToken);
    await as(liaToken).post('/campaigns/join', { inviteCode: campaign.inviteCode });
    const outsider = (
      await as(liaToken).post(`/campaigns/${campaign.id}/characters`, {
        name: 'Lia Sombra',
        className: 'Bruxa',
        race: 'Tiefling',
        level: 2
      })
    ).body.character;

    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const response = await master.post(`${DEMO}/rewards/gold`, {
      characterIds: [1, outsider.id],
      total: 50,
      mode: 'each',
      reason: 'Entre mesas'
    });

    expect(response.status).toBe(404);
    expect(await getPrisma().character.findUnique({ where: { id: 1 } })).toMatchObject({ gold: 250 });
    expect(await getPrisma().character.findUnique({ where: { id: outsider.id } })).toMatchObject({ gold: 0 });
  });

  it('Mestre da item fora da loja direto no inventario sem mexer no estoque', async () => {
    const [master, lia] = [as(await login('mestre@lojarpg.local', 'mestre123')), as(await login('lia@lojarpg.local'))];

    await master.delete(`${DEMO}/items/9`);

    const reward = await master.post(`${DEMO}/rewards/items`, {
      characterId: 3,
      itemId: 9,
      quantity: 1,
      reason: 'Bau do templo'
    });
    expect(reward.status).toBe(200);
    expect(reward.body.message).toBe('Lia Brasa recebeu 1x Anel de Protecao Menor.');

    const inventory = await lia.get(`${DEMO}/inventory/me`);
    expect(inventory.body.inventory).toEqual([
      expect.objectContaining({ quantity: 1, item: expect.objectContaining({ name: 'Anel de Protecao Menor', isActive: false }) })
    ]);
    expect(await getPrisma().item.findUnique({ where: { id: 9 } })).toMatchObject({ stock: 0 });

    const logs = await master.get(`${DEMO}/inventory/logs`);
    expect(logs.body.logs).toEqual([
      expect.objectContaining({ type: 'RECOMPENSA', characterName: 'Lia Brasa', actorName: 'Mestre do Cofre', reason: 'Bau do templo' })
    ]);

    expect((await lia.get(`${DEMO}/inventory/logs`)).status).toBe(403);
    expect(
      (await lia.post(`${DEMO}/rewards/items`, { characterId: 3, itemId: 7, quantity: 1 })).status
    ).toBe(403);
  });
});
