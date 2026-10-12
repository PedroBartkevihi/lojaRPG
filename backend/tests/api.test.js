import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
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
    post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${token}`)
      .send(url.endsWith('/purchases') ? { idempotencyKey: randomUUID(), ...body } : body),
    put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
    patch: (url, body) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
  };
}

let accountCount = 0;

// Contas proprias para as mesas reais: as da demonstracao ficam so na mesa de
// demonstracao. Cada cadastro sai de um IP proprio para nao gastar o rate
// limit de autenticacao dos outros testes.
async function newAccount(name) {
  accountCount += 1;
  const response = await request(app)
    .post('/auth/register')
    .set('X-Forwarded-For', `198.51.100.${accountCount}`)
    .send({ name, email: `${name.toLowerCase()}.${accountCount}@exemplo.com`, password: 'segredo1' });
  expect(response.status).toBe(201);
  return { token: response.body.token, user: response.body.user };
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

// Se a preparacao falhou (banco fora), closeDatabase nao existe: sem o ?., o
// erro da limpeza esconderia o erro original.
afterAll(async () => {
  await closeDatabase?.();
});

describe('validação das entradas', () => {
  it('isola catálogo, preços, estoque e abertura por vendedor', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const aria = as(await login('aria@lojarpg.local'));
    const general = (await aria.get(`${DEMO}/shops`)).body.shops[0];
    expect(general).toMatchObject({ name: 'Geral', isDefault: true, isOpen: true });
    const created = await master.post(`${DEMO}/shops`, { name: 'Alquimista', hours: 'Até o anoitecer' });
    expect(created.status).toBe(201);
    const shopId = created.body.shop.id;
    expect((await master.post(`${DEMO}/shops`, { name: 'Alquimista' })).status).toBe(409);
    const original = (await aria.get(`${DEMO}/items/6`)).body.item;
    const offer = await master.post(`${DEMO}/items`, { ...original, shopId, price: 15, stock: 3 });
    expect(offer.status).toBe(201);
    const itemId = offer.body.item.id;
    expect((await aria.get(`${DEMO}/items?shopId=${shopId}`)).body.items.map((i) => i.id)).toEqual([itemId]);
    expect((await master.patch(`${DEMO}/shops/${general.id}`, { isOpen: false })).status).toBe(200);
    const mixed = await aria.post(`${DEMO}/purchases`, { items: [{ itemId, quantity: 1 }, { itemId: 6, quantity: 1 }] });
    expect(mixed.status).toBe(409);
    expect((await aria.post(`${DEMO}/purchases`, { items: [{ itemId, quantity: 1 }] })).status).toBe(201);
    expect((await aria.get(`${DEMO}/items/6`)).body.item.stock).toBe(original.stock);
    expect((await aria.get(`${DEMO}/items/${itemId}`)).body.item.stock).toBe(2);
    expect((await aria.post(`${DEMO}/inventory/1/sell`, { itemId, quantity: 1 })).status).toBe(200);
    expect((await aria.get(`${DEMO}/items/${itemId}`)).body.item.stock).toBe(3);
    expect((await master.put(`${DEMO}/items/${itemId}`, { shopId: general.id })).status).toBe(400);
  });

  it('protege vendedores e recusa atribuição de outra mesa', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const aria = as(await login('aria@lojarpg.local'));
    const general = (await aria.get(`${DEMO}/shops`)).body.shops[0];
    expect((await aria.post(`${DEMO}/shops`, { name: 'Intruso' })).status).toBe(403);
    expect((await aria.patch(`${DEMO}/shops/${general.id}`, { isOpen: false })).status).toBe(403);
    expect((await master.patch(`${DEMO}/shops/${general.id}`, { isOpen: 'false' })).status).toBe(400);
    expect((await aria.get(`${DEMO}/items?shopId=abc`)).status).toBe(400);
    const other = await newAccount('OutroVendedor');
    const campaign = await createCampaign(other.token);
    const foreign = (await as(other.token).get(`/campaigns/${campaign.id}/shops`)).body.shops[0];
    expect((await master.patch(`${DEMO}/shops/${foreign.id}`, { isOpen: false })).status).toBe(404);
    const item = (await aria.get(`${DEMO}/items/6`)).body.item;
    expect((await master.post(`${DEMO}/items`, { ...item, shopId: foreign.id })).status).toBe(400);
    expect((await aria.get(`${DEMO}/items?shopId=${foreign.id}`)).body.items).toEqual([]);
  });

  it('agrupa compras, vendas, usos, recompensas e trocas na sessão e mantém eventos externos separados', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const aria = as(await login('aria@lojarpg.local'));
    expect((await aria.post(`${DEMO}/sessions`, {})).status).toBe(403);
    const started = await master.post(`${DEMO}/sessions`, { notes: 'Exploração da cripta' });
    expect(started.status).toBe(201);
    const sessionId = started.body.session.id;
    const buy = { items: [{ itemId: 6, quantity: 2 }], idempotencyKey: randomUUID() };
    const bought = await aria.post(`${DEMO}/purchases`, buy);
    expect(bought.body.purchase.sessionId).toBe(sessionId);
    expect((await aria.post(`${DEMO}/inventory/1/use`, { itemId: 6, quantity: 1 })).status).toBe(200);
    expect((await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 6, quantity: 1 })).status).toBe(200);
    expect((await master.post(`${DEMO}/rewards/gold`, { characterIds: [1], total: 10, mode: 'each', reason: 'Tesouro' })).status).toBe(200);
    expect((await master.post(`${DEMO}/rewards/items`, { characterId: 1, itemId: 6, quantity: 1, reason: 'Baú' })).status).toBe(200);
    expect((await aria.post(`${DEMO}/inventory/1/give`, { targetCharacterId: 2, itemId: 6, quantity: 1, gold: 2, idempotencyKey: randomUUID() })).status).toBe(200);
    const summary = await aria.get(`${DEMO}/sessions/${sessionId}/summary`);
    expect(summary.body.summary).toMatchObject({ spent: 100, purchaseCount: 1, goldChange: 10 });
    expect(summary.body.summary.movements.map((m) => m.type)).toEqual(expect.arrayContaining(['USO', 'VENDA', 'RECOMPENSA', 'TROCA']));
    expect((await aria.post(`${DEMO}/sessions/${sessionId}/close`, {})).status).toBe(403);
    expect((await master.post(`${DEMO}/sessions/${sessionId}/close`, { notes: 'Cripta concluída' })).status).toBe(200);
    expect((await master.post(`${DEMO}/sessions/${sessionId}/close`, {})).status).toBe(409);
    await aria.post(`${DEMO}/purchases`, { items: [{ itemId: 6, quantity: 1 }] });
    const filtered = await aria.get(`${DEMO}/purchases/me?sessionId=${sessionId}`);
    expect(filtered.body.purchases.map((p) => p.id)).toEqual([bought.body.purchase.id]);
    expect((await aria.get(`${DEMO}/purchases/me?sessionId=none`)).body.purchases).toHaveLength(1);
    expect((await aria.get(`${DEMO}/inventory/1/logs?sessionId=${sessionId}`)).body.logs.every((log) => log.sessionId === sessionId)).toBe(true);
    expect((await master.get(`${DEMO}/catalog/stock-movements?sessionId=${sessionId}`)).body.movements).toHaveLength(2);
    const next = await master.post(`${DEMO}/sessions`, {});
    expect(next.body.session.number).toBe(2);
    expect((await aria.post(`${DEMO}/purchases`, buy)).body.purchase.sessionId).toBe(sessionId);
    expect((await aria.get(`${DEMO}/sessions/${next.body.session.id}/summary`)).body.summary.purchaseCount).toBe(0);
  });

  it('permite só uma sessão aberta, valida filtros e isola o diário por mesa', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const results = await Promise.all([master.post(`${DEMO}/sessions`, {}), master.post(`${DEMO}/sessions`, {})]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await master.get(`${DEMO}/sessions`)).body.sessions).toHaveLength(1);
    const outsider = await newAccount('DiarioExterno');
    const own = await createCampaign(outsider.token);
    const sid = results.find((r) => r.status === 201).body.session.id;
    expect((await as(outsider.token).get(`/campaigns/${own.id}/sessions/${sid}/summary`)).status).toBe(404);
    expect((await as(outsider.token).post(`/campaigns/${own.id}/sessions/${sid}/close`, {})).status).toBe(404);
    expect((await master.get(`${DEMO}/purchases?sessionId=abc`)).status).toBe(400);
  });

  it('entrega item e ouro atomicamente, audita ambos os lados e não duplica reenvios', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    await aria.post(`${DEMO}/purchases`, { items: [{ itemId: 6, quantity: 2 }] });
    const stock = (await getPrisma().item.findUnique({ where: { id: 6 } })).stock;
    const targetQuantity = (await getPrisma().inventory.findUnique({ where: { characterId_itemId: { characterId: 2, itemId: 6 } } })).quantity;
    const body = { targetCharacterId: 2, itemId: 6, quantity: 1, gold: 20, idempotencyKey: randomUUID() };
    const results = await Promise.all([aria.post(`${DEMO}/inventory/1/give`, body), aria.post(`${DEMO}/inventory/1/give`, body)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect((await getPrisma().character.findUnique({ where: { id: 1 } })).gold).toBe(130);
    expect((await getPrisma().character.findUnique({ where: { id: 2 } })).gold).toBe(340);
    expect((await getPrisma().inventory.findUnique({ where: { characterId_itemId: { characterId: 2, itemId: 6 } } })).quantity).toBe(targetQuantity + 1);
    expect((await getPrisma().item.findUnique({ where: { id: 6 } })).stock).toBe(stock);
    expect(await getPrisma().inventoryLog.count({ where: { type: 'TROCA' } })).toBe(2);
    expect((await aria.get(`${DEMO}/inventory/1/gold-logs`)).body.logs[0].delta).toBe(-20);
    expect((await aria.get(`${DEMO}/inventory/2/gold-logs`)).status).toBe(403);
    expect((await aria.post(`${DEMO}/inventory/1/give`, { ...body, gold: 21 })).status).toBe(409);
    const failed = await aria.post(`${DEMO}/inventory/1/give`, { ...body, quantity: 9, idempotencyKey: randomUUID() });
    expect(failed.status).toBe(400);
    expect((await getPrisma().character.findUnique({ where: { id: 1 } })).gold).toBe(130);
  });

  it('recusa origem alheia, mesma origem, destinatário de outra mesa ou removido e dados inválidos', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    const key = () => randomUUID();
    expect((await aria.post(`${DEMO}/inventory/2/give`, { targetCharacterId: 1, gold: 1, idempotencyKey: key() })).status).toBe(403);
    expect((await aria.post(`${DEMO}/inventory/1/give`, { targetCharacterId: 1, gold: 1, idempotencyKey: key() })).status).toBe(400);
    for (const payload of [{}, { gold: -1 }, { itemId: 6 }, { quantity: 1 }, { gold: 0 }]) {
      expect((await aria.post(`${DEMO}/inventory/1/give`, { targetCharacterId: 2, idempotencyKey: key(), ...payload })).status).toBe(400);
    }
    const other = await newAccount('DestinoExterno');
    const otherCampaign = await createCampaign(other.token);
    const foreign = await getPrisma().character.create({ data: { campaignId: otherCampaign.id, userId: other.user.id, name: 'Outro', className: 'Mago', race: 'Elfo' } });
    expect((await aria.post(`${DEMO}/inventory/1/give`, { targetCharacterId: foreign.id, gold: 1, idempotencyKey: key() })).status).toBe(404);
    const borin = await getPrisma().character.findUnique({ where: { id: 2 } });
    await getPrisma().campaignMember.delete({ where: { campaignId_userId: { campaignId: 1, userId: borin.userId } } });
    expect((await aria.post(`${DEMO}/inventory/1/give`, { targetCharacterId: 2, gold: 1, idempotencyKey: key() })).status).toBe(404);
  });

  it('serializa transferências opostas e concorrentes sem criar dinheiro', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    const borin = as(await login('borin@lojarpg.local'));
    const opposite = await Promise.all([
      aria.post(`${DEMO}/inventory/1/give`, { targetCharacterId: 2, gold: 20, idempotencyKey: randomUUID() }),
      borin.post(`${DEMO}/inventory/2/give`, { targetCharacterId: 1, gold: 10, idempotencyKey: randomUUID() })
    ]);
    expect(opposite.map((r) => r.status)).toEqual([200, 200]);
    const attempts = await Promise.all([2, 3].map((targetCharacterId) => aria.post(`${DEMO}/inventory/1/give`, { targetCharacterId, gold: 200, idempotencyKey: randomUUID() })));
    expect(attempts.map((r) => r.status).sort()).toEqual([200, 400]);
    const balances = await getPrisma().character.aggregate({ where: { campaignId: 1 }, _sum: { gold: true } });
    expect(balances._sum.gold).toBe(750);
  });

  it('somente o Mestre abre e fecha a loja; catálogo e uso continuam disponíveis', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const aria = as(await login('aria@lojarpg.local'));
    const key = randomUUID();
    const body = { idempotencyKey: key, characterId: 1, items: [{ itemId: 6, quantity: 2 }] };
    const bought = await aria.post(`${DEMO}/purchases`, body);
    expect(bought.status).toBe(201);
    expect((await aria.patch(`${DEMO}/shop`, { shopOpen: false })).status).toBe(403);
    expect((await master.patch(`${DEMO}/shop`, { shopOpen: 'false' })).status).toBe(400);
    expect((await master.patch(`${DEMO}/shop`, { shopOpen: false })).body.campaign.shopOpen).toBe(false);
    expect((await aria.get(`${DEMO}/items`)).status).toBe(200);
    expect((await aria.get(DEMO)).body.campaign.shopOpen).toBe(false);
    expect((await aria.post(`${DEMO}/purchases`, { items: [{ itemId: 6, quantity: 1 }] })).status).toBe(409);
    expect((await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 6, quantity: 1 })).status).toBe(409);
    const replay = await aria.post(`${DEMO}/purchases`, body);
    expect(replay.body.purchase.id).toBe(bought.body.purchase.id);
    expect((await aria.post(`${DEMO}/inventory/1/use`, { itemId: 6, quantity: 1 })).status).toBe(200);
    expect((await master.patch(`${DEMO}/shop`, { shopOpen: true })).status).toBe(200);
    expect((await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 6, quantity: 1 })).status).toBe(200);
  });

  it('filtros e ids inválidos na URL recebem 400, não 500', async () => {
    const aria = as(await login('aria@lojarpg.local'));

    for (const url of [
      `${DEMO}/items?search=a&search=b`,
      `${DEMO}/items?minPrice=abc`,
      `${DEMO}/items?minPrice=100&maxPrice=10`,
      `${DEMO}/items/2147483648`
    ]) {
      const response = await aria.get(url);
      expect(response.status, url).toBe(400);
    }

    expect((await aria.get(`${DEMO}/items?minPrice=10&maxPrice=60`)).status).toBe(200);
  });

  it('respeita preço máximo zero e mantém os limites inclusivos', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const created = await master.post(`${DEMO}/items`, {
      name: 'Mapa gratuito', category: 'Equipamentos', rarity: 'Comum', price: 0, stock: 1
    });
    expect(created.status).toBe(201);
    const aria = as(await login('aria@lojarpg.local'));

    for (const query of ['maxPrice=0', 'minPrice=0&maxPrice=0']) {
      const response = await aria.get(`${DEMO}/items?${query}`);
      expect(response.status).toBe(200);
      expect(response.body.items.map((item) => item.id)).toEqual([created.body.item.id]);
    }

    const range = await aria.get(`${DEMO}/items?minPrice=0&maxPrice=60`);
    expect(range.status).toBe(200);
    expect(range.body.items.some((item) => item.price === 0)).toBe(true);
    expect(range.body.items.some((item) => item.price === 60)).toBe(true);
    expect(range.body.items.every((item) => item.price <= 60)).toBe(true);
  });

  it('categoria e raridade com nome de número são tratadas como nome', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    await master.post(`${DEMO}/catalog/categories`, { name: '2026' });

    const created = await master.post(`${DEMO}/items`, {
      name: 'Calendário Arcano',
      category: '2026',
      price: 10,
      rarity: 'Comum',
      stock: 1
    });

    expect(created.status).toBe(201);
    expect(created.body.item.category).toBe('2026');
  });

  it('recusa cadastro com email inválido ou sem nome', async () => {
    const invalidEmail = await request(app).post('/auth/register').send({
      name: 'Teste',
      email: 'sem-arroba',
      password: 'segredo1'
    });

    expect(invalidEmail.status).toBe(400);
    expect(invalidEmail.body.message).toBe('Email inválido.');

    const missingName = await request(app).post('/auth/register').send({
      name: '  ',
      email: 'teste@lojarpg.local',
      password: 'segredo1'
    });

    expect(missingName.status).toBe(400);
    expect(missingName.body.message).toBe('Nome é obrigatório.');
  });

  it('recusa personagem incompleto', async () => {
    const playerToken = await login('lia@lojarpg.local');

    const response = await as(playerToken).post(`${DEMO}/characters`, { name: 'Heroi', race: 'Humano', level: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Classe é obrigatório.');
  });

  it('recusa carrinho vazio ou com quantidade inválida', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const emptyCart = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ idempotencyKey: randomUUID(), items: [] });

    expect(emptyCart.status).toBe(400);
    expect(emptyCart.body.message).toBe('Carrinho vazio.');

    const zeroQuantity = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ idempotencyKey: randomUUID(), items: [{ itemId: 6, quantity: 0 }] });

    expect(zeroQuantity.status).toBe(400);
    expect(zeroQuantity.body.message).toBe('Itens do carrinho inválidos.');
  });

  it('responde 400 para id de personagem que não e número', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .get(`${DEMO}/purchases/me?characterId=abc`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Id do personagem');
  });

  it('edita só os campos enviados e valida o que chegou', async () => {
    const masterToken = await login('mestre@lojarpg.local', 'mestre123');

    const partialUpdate = await request(app)
      .put(`${DEMO}/items/1`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ description: 'Forjada por anões.' });

    expect(partialUpdate.status).toBe(200);
    expect(partialUpdate.body.item).toMatchObject({
      name: 'Espada Longa',
      price: 75,
      stock: 5,
      description: 'Forjada por anões.'
    });

    const invalidPrice = await request(app)
      .put(`${DEMO}/items/1`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ price: -10 });

    expect(invalidPrice.status).toBe(400);
    expect(invalidPrice.body.message).toBe('Preço deve ser um número inteiro entre 0 e 1000000.');
  });
});

describe('integridade do banco', () => {
  it('recusa ouro, estoque e nível inválidos mesmo fora da API', async () => {
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

describe('autenticação e autorização', () => {
  it('realiza login e retorna usuário e token', async () => {
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

  it('aceita uma renovação só quando o mesmo refresh token chega várias vezes junto', async () => {
    const loginResponse = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-For', '203.0.113.40')
      .send({ email: 'aria@lojarpg.local', password: 'jogador123' });
    const { refreshToken, user } = loginResponse.body;

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/auth/refresh').send({ refreshToken }))
    );

    expect(responses.map((response) => response.status).sort()).toEqual([200, 401, 401, 401, 401]);
    expect(await getPrisma().refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(1);
  });

  it('conta as renovações num limite próprio, separado do login', async () => {
    const ip = '203.0.113.30';
    const attempt = (url, body) => request(app).post(url).set('X-Forwarded-For', ip).send(body);

    for (let index = 0; index < 20; index += 1) {
      await attempt('/auth/login', { email: 'ninguem@lojarpg.local', password: 'errada1' });
    }

    expect((await attempt('/auth/login', { email: 'ninguem@lojarpg.local', password: 'errada1' })).status).toBe(429);
    expect((await attempt('/auth/refresh', { refreshToken: 'token-desconhecido' })).status).toBe(401);
  });

  it('separa o rate limit por usuário atras de proxy', async () => {
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

  it('recusa origem fora do CORS com 403, sem erro interno', async () => {
    const response = await request(app).get('/health').set('Origin', 'https://site-desconhecido.example');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Origem não permitida pelo CORS.');
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
      .send({ amount: 25, mode: 'adjust', reason: 'Recompensa de sessão' });

    expect(response.status).toBe(200);
    expect(response.body.character.gold).toBe(275);
    expect(response.body.auditLog).toMatchObject({
      previousGold: 250,
      newGold: 275,
      delta: 25,
      reason: 'Recompensa de sessão'
    });

    const auditResponse = await request(app)
      .get(`${DEMO}/characters/gold-audit`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.logs).toHaveLength(1);
  });
});

describe('itens', () => {
  it('editar o item não repõe a unidade vendida enquanto o formulário estava aberto', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const aria = as(await login('aria@lojarpg.local'));
    const opened = (await master.get(`${DEMO}/items?includeInactive=true`)).body.items.find((item) => item.id === 6);

    await aria.post(`${DEMO}/purchases`, { items: [{ itemId: 6, quantity: 1 }] });

    // O formulario envia o estoque que o Mestre viu: a compra no meio gera 409.
    const stale = await master.put(`${DEMO}/items/6`, { ...opened, name: 'Poção de Cura Maior', expectedStock: opened.stock });
    expect(stale.status).toBe(409);

    // Um cliente antigo nao pode contornar a pre-condicao omitindo-a.
    const unguarded = await master.put(`${DEMO}/items/6`, { ...opened, name: 'Snapshot antigo' });
    expect(unguarded.status).toBe(400);
    expect(unguarded.body.message).toContain('expectedStock');
    expect((await getPrisma().item.findUnique({ where: { id: 6 } })).stock).toBe(opened.stock - 1);

    // Sem mexer no estoque, so o nome muda e a venda continua contada.
    const renamed = await master.put(`${DEMO}/items/6`, { name: 'Poção de Cura Maior' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.item.stock).toBe(opened.stock - 1);

    const restocked = await master.put(`${DEMO}/items/6`, { stock: 20, expectedStock: opened.stock - 1 });
    expect(restocked.status).toBe(200);
    expect(restocked.body.item.stock).toBe(20);
  });

  it('busca itens sem diferenciar acentos nem maiúsculas', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await as(playerToken).get(`${DEMO}/items?search=POCAO`);

    expect(response.body.items.map((item) => item.name)).toEqual(['Poção de Cura', 'Poção de Invisibilidade']);
  });

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
      .send({ price: 55, stock: 3, expectedStock: 2 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.item).toMatchObject({ price: 55, stock: 3 });

    const deleteResponse = await request(app)
      .delete(`${DEMO}/items/${itemId}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.item.isActive).toBe(false);
  });
});

describe('catálogo', () => {
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
    const invisibilityPotion = itemsResponse.body.items.find((item) => item.name === 'Poção de Invisibilidade');

    expect(invisibilityPotion.rarity).toBe('Comum');
  });
});

describe('compras e inventário', () => {
  it('conclui carrinhos invertidos de dois personagens sem deadlock ou perda de estoque', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    const borin = as(await login('borin@lojarpg.local'));
    const prisma = getPrisma();
    const initialItems = await prisma.item.findMany({ where: { id: { in: [6, 10] } } });
    const total = initialItems.reduce((sum, item) => sum + item.price, 0);
    const originalTransaction = prisma.$transaction.bind(prisma);
    let transactionNumber = 0;
    let lockedItem;
    let firstLocked;
    let secondReady;
    const firstLock = new Promise((resolve) => { firstLocked = resolve; });
    const secondLock = new Promise((resolve) => { secondReady = resolve; });
    prisma.$transaction = (callback, options) => {
      const number = transactionNumber++;
      return originalTransaction(async (tx) => {
        let firstStockWrite = true;
        return callback(new Proxy(tx, { get(target, model) {
          const delegate = Reflect.get(target, model);
          if (model !== 'item') return delegate;
          return new Proxy(delegate, { get(modelTarget, action) {
            const method = Reflect.get(modelTarget, action);
            if (action !== 'updateMany') return method;
            return async (args) => {
              if (!firstStockWrite || args.data?.stock?.decrement === undefined) return method.call(modelTarget, args);
              firstStockWrite = false;
              if (number === 0) {
                const result = await method.call(modelTarget, args);
                lockedItem = args.where.id;
                firstLocked();
                await secondLock;
                return result;
              }
              await firstLock;
              // Se ambas comecam pelo mesmo item, liberar a primeira antes
              // de esperar seu lock. Ordens opostas seguram dois locks.
              if (args.where.id === lockedItem) secondReady();
              const result = await method.call(modelTarget, args);
              secondReady();
              return result;
            };
          } });
        } }));
      }, options);
    };
    try {
      const responses = await Promise.all([
        aria.post(`${DEMO}/purchases`, { items: [{ itemId: 6, quantity: 1 }, { itemId: 10, quantity: 1 }] }),
        borin.post(`${DEMO}/purchases`, { items: [{ itemId: 10, quantity: 1 }, { itemId: 6, quantity: 1 }] })
      ]);
      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      expect(await prisma.purchase.count()).toBe(2);
      for (const item of initialItems) {
        expect((await prisma.item.findUnique({ where: { id: item.id } })).stock).toBe(item.stock - 2);
      }
      expect((await prisma.character.findUnique({ where: { id: 1 } })).gold).toBe(250 - total);
      expect((await prisma.character.findUnique({ where: { id: 2 } })).gold).toBe(320 - total);
    } finally {
      firstLocked(); secondReady();
      prisma.$transaction = originalTransaction;
    }
  });

  it('exige uma chave de compra valida', async () => {
    const token = await login('aria@lojarpg.local');
    for (const idempotencyKey of [undefined, '', 'chave-invalida', ['nao-e-texto']]) {
      const response = await request(app).post(`${DEMO}/purchases`).set('Authorization', `Bearer ${token}`)
        .send({ idempotencyKey, items: [{ itemId: 6, quantity: 1 }] });
      expect(response.status).toBe(400);
    }
    expect(await getPrisma().purchase.count()).toBe(0);
  });

  it('a mesma intencao concorrente ou reenviada compra e desconta uma unica vez', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    const payload = { idempotencyKey: randomUUID(), characterId: 1, items: [{ itemId: 6, quantity: 1 }] };
    const [first, simultaneous] = await Promise.all([
      aria.post(`${DEMO}/purchases`, payload), aria.post(`${DEMO}/purchases`, payload)
    ]);
    const retry = await aria.post(`${DEMO}/purchases`, payload);
    expect([first.status, simultaneous.status, retry.status]).toEqual([201, 201, 201]);
    expect(simultaneous.body).toEqual(first.body);
    expect(retry.body).toEqual(first.body);
    expect(await getPrisma().purchase.count()).toBe(1);
    expect((await getPrisma().character.findUnique({ where: { id: 1 } })).gold).toBe(200);
    expect((await getPrisma().inventory.findUnique({ where: { characterId_itemId: { characterId: 1, itemId: 6 } } })).quantity).toBe(1);
  });

  it('recusa reutilizar a chave com outro payload mas permite uma nova intencao igual', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    const payload = { idempotencyKey: randomUUID(), items: [{ itemId: 6, quantity: 1 }] };
    expect((await aria.post(`${DEMO}/purchases`, payload)).status).toBe(201);
    expect((await aria.post(`${DEMO}/purchases`, { ...payload, items: [{ itemId: 6, quantity: 2 }] })).status).toBe(409);
    expect((await aria.post(`${DEMO}/purchases`, { ...payload, idempotencyKey: randomUUID() })).status).toBe(201);
    expect(await getPrisma().purchase.count()).toBe(2);
  });

  it('uma compra abortada nao consome a chave nem reserva estoque', async () => {
    const prisma = getPrisma();
    const aria = as(await login('aria@lojarpg.local'));
    const payload = { idempotencyKey: randomUUID(), items: [{ itemId: 6, quantity: 1 }] };
    await prisma.character.update({ where: { id: 1 }, data: { gold: 0 } });
    expect((await aria.post(`${DEMO}/purchases`, payload)).status).toBe(400);
    expect(await prisma.checkoutRequest.count()).toBe(0);
    await prisma.character.update({ where: { id: 1 }, data: { gold: 100 } });
    expect((await aria.post(`${DEMO}/purchases`, payload)).status).toBe(201);
    expect((await prisma.character.findUnique({ where: { id: 1 } })).gold).toBe(50);
  });

  it('a chave de outro usuario nao revela nem reutiliza a compra dele', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    const borin = as(await login('borin@lojarpg.local'));
    const payload = { idempotencyKey: randomUUID(), items: [{ itemId: 6, quantity: 1 }] };
    const first = await aria.post(`${DEMO}/purchases`, payload);
    const second = await borin.post(`${DEMO}/purchases`, payload);
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(first.body.purchase.characterId).toBe(1);
    expect(second.body.purchase.characterId).toBe(2);
    expect(second.body.purchase.id).not.toBe(first.body.purchase.id);
  });

  it('recusa compra sem ouro suficiente', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ idempotencyKey: randomUUID(), items: [{ itemId: 7, quantity: 2 }] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Ouro insuficiente');
  });

  it('recusa compra sem estoque suficiente', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const response = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ idempotencyKey: randomUUID(), items: [{ itemId: 9, quantity: 2 }] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Estoque insuficiente');
  });

  it('atualiza ouro, estoque, inventário e histórico apos compra', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const purchaseResponse = await request(app)
      .post(`${DEMO}/purchases`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ idempotencyKey: randomUUID(), items: [{ itemId: 6, quantity: 1 }] });

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
          item: expect.objectContaining({ name: 'Poção de Cura' })
        })
      ])
    );

    const historyResponse = await request(app)
      .get(`${DEMO}/purchases/me`)
      .set('Authorization', `Bearer ${playerToken}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.purchases).toHaveLength(1);
  });

  it('não vende alem do estoque com compras simultaneas', async () => {
    const tokens = await Promise.all(
      ['aria@lojarpg.local', 'borin@lojarpg.local', 'lia@lojarpg.local'].map((email) => login(email))
    );

    const responses = await Promise.all(
      tokens.map((token) =>
        request(app)
          .post(`${DEMO}/purchases`)
          .set('Authorization', `Bearer ${token}`)
          .send({ idempotencyKey: randomUUID(), items: [{ itemId: 8, quantity: 1 }] })
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 201, 400]);
    expect(responses.find((response) => response.status === 400).body.message).toContain('Estoque insuficiente');

    const scroll = await getPrisma().item.findUnique({ where: { id: 8 } });
    expect(scroll.stock).toBe(0);
  });

  it('não gasta o mesmo ouro duas vezes com compras simultaneas', async () => {
    const playerToken = await login('aria@lojarpg.local');

    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post(`${DEMO}/purchases`)
          .set('Authorization', `Bearer ${playerToken}`)
          .send({ idempotencyKey: randomUUID(), items: [{ itemId: 7, quantity: 1 }] })
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);
    expect(responses.find((response) => response.status === 400).body.message).toContain('Ouro insuficiente');

    const aria = await getPrisma().character.findUnique({ where: { id: 1 } });
    expect(aria.gold).toBe(30);
  });

  it('não perde a compra quando o Mestre ajusta o ouro ao mesmo tempo', async () => {
    const [playerToken, masterToken] = [
      await login('aria@lojarpg.local'),
      await login('mestre@lojarpg.local', 'mestre123')
    ];

    const [purchaseResponse, goldResponse] = await Promise.all([
      request(app)
        .post(`${DEMO}/purchases`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ idempotencyKey: randomUUID(), items: [{ itemId: 7, quantity: 1 }] }),
      request(app)
        .patch(`${DEMO}/characters/1/gold`)
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ amount: 25, mode: 'adjust', reason: 'Recompensa de sessão' })
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

  it('não desfaz a compra quando o Mestre edita o item ao mesmo tempo', async () => {
    const [playerToken, masterToken] = [
      await login('borin@lojarpg.local'),
      await login('mestre@lojarpg.local', 'mestre123')
    ];

    const [purchaseResponse, editResponse] = await Promise.all([
      request(app)
        .post(`${DEMO}/purchases`)
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ idempotencyKey: randomUUID(), items: [{ itemId: 8, quantity: 1 }] }),
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
  it('cria conta sem papel e a mesa nova já vem com o catálogo inicial', async () => {
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
    const [{ token: borinToken }, { token: caioToken }] = [await newAccount('Borin'), await newAccount('Caio')];
    const campaign = await createCampaign(borinToken);
    const caioCampaign = await createCampaign(caioToken, 'Mesa do Caio');
    await as(borinToken).post('/campaigns/join', { inviteCode: caioCampaign.inviteCode });

    const list = await as(borinToken).get('/campaigns');

    expect(list.body.campaigns).toEqual([
      expect.objectContaining({ id: campaign.id, role: 'MESTRE' }),
      expect.objectContaining({ id: caioCampaign.id, role: 'JOGADOR' })
    ]);
    expect(list.body.campaigns[1]).not.toHaveProperty('inviteCode');

    const createAsPlayer = await as(borinToken).post(`/campaigns/${caioCampaign.id}/items`, {
      name: 'Tocha',
      category: 'Equipamentos',
      price: 1,
      rarity: 'Comum',
      stock: 1
    });
    expect(createAsPlayer.status).toBe(403);

    const createInOwn = await as(borinToken).post(`/campaigns/${campaign.id}/items`, {
      name: 'Tocha',
      category: 'Equipamentos',
      price: 1,
      rarity: 'Comum',
      stock: 1
    });
    expect(createInOwn.status).toBe(201);
  });

  it('jogador entra pelo código de convite e cria personagem na mesa', async () => {
    const [{ token: borinToken }, { token: liaToken }] = [await newAccount('Borin'), await newAccount('Lia')];
    const campaign = await createCampaign(borinToken);
    const typedCode = `${campaign.inviteCode.slice(0, 4)}-${campaign.inviteCode.slice(4)}`.toLowerCase();

    const join = await as(liaToken).post('/campaigns/join', { inviteCode: typedCode });

    expect(join.status).toBe(201);
    expect(join.body.campaign).toMatchObject({ id: campaign.id, role: 'JOGADOR', memberCount: 2 });
    expect(join.body.campaign).not.toHaveProperty('inviteCode');

    const joinAgain = await as(liaToken).post('/campaigns/join', { inviteCode: campaign.inviteCode });
    expect(joinAgain.status).toBe(200);
    expect(joinAgain.body.message).toContain('já participa');

    const wrongCode = await as(liaToken).post('/campaigns/join', { inviteCode: 'ZZZZZZZZ' });
    expect(wrongCode.status).toBe(404);
    expect(wrongCode.body.message).toBe('Código de convite inválido.');

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

  it('uma mesa não ve nem altera itens, personagens e catálogo de outra', async () => {
    const [{ token: borinToken }, masterToken, ariaToken] = [
      await newAccount('Borin'),
      await login('mestre@lojarpg.local', 'mestre123'),
      await login('aria@lojarpg.local')
    ];
    const campaign = await createCampaign(borinToken);
    const borin = as(borinToken);
    const ownItems = (await borin.get(`/campaigns/${campaign.id}/items`)).body.items;

    const outsider = await as(masterToken).get(`/campaigns/${campaign.id}/items`);
    expect(outsider.status).toBe(404);
    expect(outsider.body.message).toBe('Mesa não encontrada.');

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
    expect(foreignCategory.body.message).toBe('Categoria não encontrada.');

    const crossPurchase = await as(ariaToken).post(`${DEMO}/purchases`, {
      items: [{ itemId: ownItems[0].id, quantity: 1 }]
    });
    expect(crossPurchase.status).toBe(404);

    const newItem = await borin.post(`/campaigns/${campaign.id}/items`, {
      name: 'Machado Rúnico',
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

  it('Mestre troca o código, remove jogador e ele volta com os personagens', async () => {
    const [{ token: borinToken, user: borinUser }, { token: liaToken, user: liaUser }] = [
      await newAccount('Borin'),
      await newAccount('Lia')
    ];
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

    const playerRemovesMaster = await lia.delete(`${base}/members/${borinUser.id}`);
    expect(playerRemovesMaster.status).toBe(403);

    const masterLeaves = await borin.delete(`${base}/members/${borinUser.id}`);
    expect(masterLeaves.status).toBe(400);

    const removed = await borin.delete(`${base}/members/${liaUser.id}`);
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

    const leave = await lia.delete(`${base}/members/${liaUser.id}`);
    expect(leave.status).toBe(200);
    expect(leave.body.message).toContain('Você saiu');
  });

  it('Mestre exclui a mesa mesmo com compras e inventário', async () => {
    const [{ token: borinToken }, { token: liaToken }] = [await newAccount('Borin'), await newAccount('Lia')];
    const campaign = await createCampaign(borinToken);
    const [borin, lia] = [as(borinToken), as(liaToken)];
    const base = `/campaigns/${campaign.id}`;

    await lia.post('/campaigns/join', { inviteCode: campaign.inviteCode });
    const character = (
      await lia.post(`${base}/characters`, { name: 'Lia Sombra', className: 'Bruxa', race: 'Tiefling', level: 2 })
    ).body.character;
    await borin.patch(`${base}/characters/${character.id}/gold`, { amount: 100, mode: 'adjust', reason: 'Início' });
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
    expect((await lia.get('/campaigns')).body.campaigns).toEqual([]);

    const prisma = getPrisma();
    expect(await prisma.item.count({ where: { campaignId: campaign.id } })).toBe(0);
    expect(await prisma.character.count({ where: { campaignId: campaign.id } })).toBe(0);
    expect(await prisma.item.count({ where: { campaignId: 1 } })).toBe(10);
  });

  it('contas de demonstração ficam só na mesa de demonstração', async () => {
    const pedro = await newAccount('Pedro');
    const realCampaign = await createCampaign(pedro.token, 'Mesa do Pedro');
    const ariaLogin = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-For', '203.0.113.60')
      .send({ email: 'aria@lojarpg.local', password: 'jogador123' });
    const aria = as(ariaLogin.body.token);

    expect(ariaLogin.body.user.isDemo).toBe(true);
    expect(pedro.user.isDemo).toBe(false);

    const join = await aria.post('/campaigns/join', { inviteCode: realCampaign.inviteCode });
    expect(join.status).toBe(403);
    expect(join.body.message).toContain('conta de demonstração');

    const create = await aria.post('/campaigns', { name: 'Mesa da Aria' });
    expect(create.status).toBe(403);

    const demo = await aria.post('/campaigns/join', { inviteCode: 'MESADEMO' });
    expect(demo.status).toBe(200);
    expect((await aria.get('/campaigns')).body.campaigns.map((campaign) => campaign.id)).toEqual([1]);
  });

  it('bloqueia acesso demo e o reset quando ha dados legados fora da demonstracao', async () => {
    const pedro = await newAccount('Pedro');
    const campaign = await createCampaign(pedro.token);
    const prisma = getPrisma();
    await prisma.campaignMember.create({ data: { campaignId: campaign.id, userId: 2, role: 'JOGADOR' } });
    const character = await prisma.character.create({
      data: { campaignId: campaign.id, userId: 2, name: 'Legado', className: 'Mago', race: 'Elfo', gold: 100 }
    });
    const purchase = await prisma.purchase.create({ data: { characterId: character.id, totalValue: 25 } });
    const aria = as(await login('aria@lojarpg.local'));
    expect((await aria.get('/campaigns')).body.campaigns.map((entry) => entry.id)).toEqual([1]);
    expect((await aria.post('/campaigns/join', { inviteCode: campaign.inviteCode })).status).toBe(403);
    expect((await aria.get(`/campaigns/${campaign.id}`)).status).toBe(404);
    expect((await aria.get(`/campaigns/${campaign.id}/characters/me`)).status).toBe(404);
    expect((await aria.post(`/campaigns/${campaign.id}/purchases`, { characterId: character.id, items: [] })).status).toBe(404);
    await expect(resetDemo(prisma)).rejects.toThrow('preservar dados legados');
    expect(await prisma.character.findUnique({ where: { id: character.id } })).not.toBeNull();
    expect(await prisma.purchase.findUnique({ where: { id: purchase.id } })).not.toBeNull();
    expect(await prisma.character.findUnique({ where: { id: 1 } })).not.toBeNull();

    // Mesmo depois de sair da mesa, o personagem antigo precisa ser preservado.
    await prisma.campaignMember.delete({ where: { campaignId_userId: { campaignId: campaign.id, userId: 2 } } });
    await expect(resetDemo(prisma)).rejects.toThrow('preservar dados legados');
  });

  it('nao identifica como demo uma mesa antiga pelo id ou pelo Mestre publico', async () => {
    const prisma = getPrisma();
    await prisma.campaign.update({ where: { id: 1 }, data: { isDemo: false, name: 'Mesa principal', inviteCode: 'LEGADO23' } });
    await expect(resetDemo(prisma)).rejects.toThrow('preservar dados legados');
    expect(await prisma.character.count()).toBe(3);
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    expect((await master.get('/campaigns')).body.campaigns).toEqual([]);
    expect((await master.delete(DEMO)).status).toBe(404);
  });

  it('mantem a identidade demo depois de regenerar o convite', async () => {
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const renewed = await master.post(`${DEMO}/invite-code`);
    expect(renewed.status).toBe(200);
    expect(renewed.body.campaign.inviteCode).not.toBe('MESADEMO');
    expect(renewed.body.campaign.isDemo).toBe(true);
    const aria = as(await login('aria@lojarpg.local'));
    expect((await aria.post('/campaigns/join', { inviteCode: renewed.body.campaign.inviteCode })).status).toBe(200);
    await resetDemo(getPrisma());
    expect((await master.get(DEMO)).body.campaign.inviteCode).toBe('MESADEMO');
  });

  it('o reset da demonstração preserva as mesas reais e os personagens delas', async () => {
    const [pedro, caio] = [await newAccount('Pedro'), await newAccount('Caio')];
    const realCampaign = await createCampaign(pedro.token, 'Mesa do Pedro');
    const base = `/campaigns/${realCampaign.id}`;

    await as(caio.token).post('/campaigns/join', { inviteCode: realCampaign.inviteCode });
    const character = (
      await as(caio.token).post(`${base}/characters`, { name: 'Caio Ferro', className: 'Guerreiro', race: 'Anão', level: 1 })
    ).body.character;
    await as(pedro.token).patch(`${base}/characters/${character.id}/gold`, { amount: 100, mode: 'adjust', reason: 'Início' });
    const potion = (await as(caio.token).get(`${base}/items?search=Cura`)).body.items[0];
    await as(caio.token).post(`${base}/purchases`, { characterId: character.id, items: [{ itemId: potion.id, quantity: 1 }] });

    const ariaToken = await login('aria@lojarpg.local');
    await as(ariaToken).post(`${DEMO}/purchases`, { items: [{ itemId: 6, quantity: 1 }] });

    await resetDemo(getPrisma());

    const prisma = getPrisma();
    const campaigns = await prisma.campaign.findMany({ orderBy: { id: 'asc' } });

    expect(campaigns.map((campaign) => campaign.name)).toEqual(['Mesa de demonstração', 'Mesa do Pedro']);
    expect(await prisma.campaignMember.count({ where: { campaignId: realCampaign.id } })).toBe(2);
    expect(await prisma.item.count({ where: { campaignId: realCampaign.id } })).toBe(10);
    expect(await prisma.character.findUnique({ where: { id: character.id } })).toMatchObject({ name: 'Caio Ferro' });
    expect(await prisma.purchase.count({ where: { characterId: character.id } })).toBe(1);
    expect(await prisma.character.findUnique({ where: { id: 1 } })).toMatchObject({ gold: 250 });
    expect(await prisma.purchase.count({ where: { character: { campaignId: 1 } } })).toBe(0);

    const newUser = await prisma.user.create({
      data: { name: 'Depois do reset', email: 'depois@exemplo.com', passwordHash: 'x' }
    });
    expect(newUser.id).toBeGreaterThan(caio.user.id);
  });
});

describe('historicos paginados', () => {
  it('percorre mais de 50 registros com datas iguais sem repetir nem perder entradas', async () => {
    const prisma = getPrisma();
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    const at = new Date('2026-01-01T00:00:00Z');
    await prisma.inventoryLog.createMany({ data: Array.from({ length: 65 }, () => ({
      characterId: 1, itemId: 6, type: 'USO', quantity: 1, createdAt: at
    })) });
    await prisma.goldAuditLog.createMany({ data: Array.from({ length: 65 }, () => ({
      characterId: 1, actorUserId: 1, previousGold: 0, newGold: 1, delta: 1, reason: 'Historico', createdAt: at
    })) });
    await prisma.stockMovement.createMany({ data: Array.from({ length: 65 }, () => ({
      itemId: 6, previousStock: 0, newStock: 1, delta: 1, reason: 'Historico', createdAt: at
    })) });
    await prisma.purchase.createMany({ data: Array.from({ length: 65 }, () => ({ characterId: 1, totalValue: 1, purchasedAt: at })) });
    for (const [path, field] of [
      ['/inventory/logs', 'logs'], ['/characters/gold-audit', 'logs'],
      ['/catalog/stock-movements', 'movements'], ['/purchases', 'purchases']
    ]) {
      const ids = [];
      let cursor;
      const sizes = [];
      do {
        const response = await master.get(`${DEMO}${path}?limit=25${cursor ? `&cursor=${cursor}` : ''}`);
        expect(response.status).toBe(200);
        ids.push(...response.body[field].map((entry) => entry.id));
        sizes.push(response.body[field].length);
        cursor = response.body.pagination.nextCursor;
      } while (cursor);
      expect(sizes).toEqual([25, 25, 15]);
      expect(new Set(ids).size).toBe(65);
      expect(ids).toEqual([...ids].sort((a, b) => b - a));
    }
  });

  it('mantem o cursor valido com insercoes novas e exclusao da linha de fronteira', async () => {
    const prisma = getPrisma();
    const aria = as(await login('aria@lojarpg.local'));
    await prisma.inventoryLog.createMany({ data: Array.from({ length: 4 }, () => ({
      characterId: 1, itemId: 6, type: 'USO', quantity: 1, createdAt: new Date('2026-01-01T00:00:00Z')
    })) });
    const first = await aria.get(`${DEMO}/inventory/1/logs?limit=2`);
    expect(first.status).toBe(200);
    await prisma.inventoryLog.delete({ where: { id: first.body.logs[1].id } });
    const newer = await prisma.inventoryLog.create({ data: { characterId: 1, itemId: 6, type: 'USO', quantity: 1 } });
    const second = await aria.get(`${DEMO}/inventory/1/logs?limit=2&cursor=${first.body.pagination.nextCursor}`);
    expect(second.status).toBe(200);
    expect(second.body.logs).toHaveLength(2);
    expect(second.body.logs.map((entry) => entry.id)).not.toContain(newer.id);
    expect(second.body.pagination.hasMore).toBe(false);
    expect((await aria.get(`${DEMO}/inventory/2/logs`)).status).toBe(403);
    const foreign = await prisma.campaign.create({ data: { name: 'Outra mesa', inviteCode: 'PAGINADO' } });
    const other = await prisma.character.create({ data: {
      campaignId: foreign.id, userId: 2, name: 'Outro', className: 'Mago', race: 'Elfo'
    } });
    expect((await aria.get(`${DEMO}/inventory/${other.id}/logs`)).status).toBe(404);
  });

  it('valida limite e cursor e preserva filtros de personagem em compras', async () => {
    const aria = as(await login('aria@lojarpg.local'));
    const master = as(await login('mestre@lojarpg.local', 'mestre123'));
    for (const query of ['limit=0', 'limit=101', 'limit=abc', 'limit=1&limit=2', 'cursor=abc', 'cursor=a&cursor=b']) {
      expect((await master.get(`${DEMO}/purchases?${query}`)).status).toBe(400);
    }
    const prisma = getPrisma();
    await prisma.purchase.createMany({ data: [{ characterId: 1, totalValue: 10 }, { characterId: 2, totalValue: 20 }] });
    const own = await aria.get(`${DEMO}/purchases/me?characterId=1&limit=1`);
    expect(own.body.purchases).toHaveLength(1);
    expect(own.body.purchases[0].characterId).toBe(1);
    expect(own.body.pagination.hasMore).toBe(false);
    expect((await aria.get(`${DEMO}/purchases/me?characterId=2`)).status).toBe(403);
  });
});

describe('inventário e recompensas', () => {
  it('compras e vendas simultâneas do mesmo personagem não travam o banco', async () => {
    const borin = as(await login('borin@lojarpg.local'));

    // Borin compra e vende Poção de Cura ao mesmo tempo, várias vezes. Com a
    // compra e a venda travando personagem e inventário em ordens opostas, o
    // PostgreSQL abortava uma delas por deadlock (erro 500).
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        index % 2 === 0
          ? borin.post(`${DEMO}/purchases`, { characterId: 2, items: [{ itemId: 6, quantity: 1 }] })
          : borin.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 })
      )
    );

    expect(responses.map((response) => response.status).filter((status) => status >= 500)).toEqual([]);
  });

  it('vende pela metade do preço, paga o personagem e devolve o item ao estoque', async () => {
    const borin = as(await login('borin@lojarpg.local'));

    const sale = await borin.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 });

    expect(sale.status).toBe(200);
    expect(sale.body.message).toBe('Venda concluída: 1x Poção de Cura por 25 ouro.');
    expect(sale.body.character.gold).toBe(345);

    const inventory = await borin.get(`${DEMO}/inventory/me`);
    expect(inventory.body.inventory).toEqual([
      expect.objectContaining({ quantity: 1, item: expect.objectContaining({ name: 'Poção de Cura', effectiveSellPrice: 25 }) })
    ]);
    expect(inventory.body.logs).toEqual([
      expect.objectContaining({ type: 'VENDA', itemName: 'Poção de Cura', quantity: 1, unitPrice: 25, total: 25 })
    ]);

    const prisma = getPrisma();
    expect(await prisma.item.findUnique({ where: { id: 6 } })).toMatchObject({ stock: 13 });
    expect(await prisma.stockMovement.findFirst({ where: { itemId: 6 } })).toMatchObject({
      previousStock: 12,
      newStock: 13,
      reason: 'Venda de Borin Escudoforte'
    });
  });

  it('usa o preço de venda do Mestre e recusa o que a loja não compra', async () => {
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
    expect(refused.body.message).toBe('A loja não compra Poção de Cura.');

    const invalidPrice = await master.put(`${DEMO}/items/6`, { sellPrice: -5 });
    expect(invalidPrice.status).toBe(400);
  });

  it('não vende o que o personagem não tem nem itens de outro jogador', async () => {
    const [aria, master] = [as(await login('aria@lojarpg.local')), as(await login('mestre@lojarpg.local', 'mestre123'))];

    const missing = await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 6, quantity: 1 });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('Quantidade insuficiente de Poção de Cura no inventário.');

    const tooMany = await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 10, quantity: 2 });
    expect(tooMany.status).toBe(400);

    expect((await aria.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 })).status).toBe(403);
    expect((await master.post(`${DEMO}/inventory/2/sell`, { itemId: 6, quantity: 1 })).status).toBe(403);
    expect((await aria.post(`${DEMO}/inventory/1/sell`, { itemId: 10, quantity: 0 })).status).toBe(400);
  });

  it('vendas simultaneas do último item pagam uma vez só', async () => {
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

  it('usa item, tira do inventário e registra no histórico', async () => {
    const borin = as(await login('borin@lojarpg.local'));

    const used = await borin.post(`${DEMO}/inventory/2/use`, { itemId: 6, quantity: 1, reason: 'Curou a Lia' });
    expect(used.status).toBe(200);
    expect(used.body.message).toBe('Item usado: 1x Poção de Cura.');

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
      reason: 'Tesouro do dragão'
    });

    expect(split.status).toBe(200);
    expect(split.body).toMatchObject({ share: 33, remainder: 1 });
    expect(split.body.message).toContain('Sobrou 1.');
    expect(split.body.characters.map((character) => character.gold)).toEqual([283, 353, 213]);

    const audit = (await master.get(`${DEMO}/characters/gold-audit`)).body.logs;
    expect(audit).toHaveLength(3);
    expect(audit.every((log) => log.delta === 33 && log.reason === 'Tesouro do dragão')).toBe(true);

    const each = await master.post(`${DEMO}/rewards/gold`, {
      characterIds: [1, 2],
      total: 10,
      mode: 'each',
      reason: 'Missão concluída'
    });
    expect(each.body.characters.map((character) => character.gold)).toEqual([293, 363]);

    const single = await master.post(`${DEMO}/rewards/gold`, {
      characterIds: [3],
      total: 7,
      mode: 'split',
      reason: 'Achado'
    });
    expect(single.body.message).toBe('7 de ouro para Lia Brasa.');

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
      reason: 'Trapaça'
    });
    expect(byPlayer.status).toBe(403);
  });

  it('Mestre não da ouro a personagem de outra mesa', async () => {
    const [{ token: borinToken }, { token: liaToken }] = [await newAccount('Borin'), await newAccount('Lia')];
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

  it('Mestre da item fora da loja direto no inventário sem mexer no estoque', async () => {
    const [master, lia] = [as(await login('mestre@lojarpg.local', 'mestre123')), as(await login('lia@lojarpg.local'))];

    await master.delete(`${DEMO}/items/9`);

    const reward = await master.post(`${DEMO}/rewards/items`, {
      characterId: 3,
      itemId: 9,
      quantity: 1,
      reason: 'Baú do templo'
    });
    expect(reward.status).toBe(200);
    expect(reward.body.message).toBe('Lia Brasa recebeu 1x Anel de Proteção Menor.');

    const inventory = await lia.get(`${DEMO}/inventory/me`);
    expect(inventory.body.inventory).toEqual([
      expect.objectContaining({ quantity: 1, item: expect.objectContaining({ name: 'Anel de Proteção Menor', isActive: false }) })
    ]);
    expect(await getPrisma().item.findUnique({ where: { id: 9 } })).toMatchObject({ stock: 0 });

    const logs = await master.get(`${DEMO}/inventory/logs`);
    expect(logs.body.logs).toEqual([
      expect.objectContaining({ type: 'RECOMPENSA', characterName: 'Lia Brasa', actorName: 'Mestre do Cofre', reason: 'Baú do templo' })
    ]);

    expect((await lia.get(`${DEMO}/inventory/logs`)).status).toBe(403);
    expect(
      (await lia.post(`${DEMO}/rewards/items`, { characterId: 3, itemId: 7, quantity: 1 })).status
    ).toBe(403);
  });
});
