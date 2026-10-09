import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { STARTER_CATEGORIES, STARTER_ITEMS, STARTER_RARITIES } from '../src/data/starterCatalog.js';
import { deleteCampaigns } from '../src/models/campaignModel.js';

const mestreHash =
  'scrypt$Wbrr8428uiTv9A82oz_n7Q$q4GLTusqxv1L8sy0P_An9-0XFVEMDgjeAeKzIqG2csfRzZXJdCzS4JgTPkxmuajrGJE8sC8KixTHeYxSmXp4ZQ';
const jogadorHash =
  'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA';

// Contas e mesa da demonstracao publica. O codigo MESADEMO nunca sai do
// gerador de convites (que nao usa a letra O), entao nao colide com uma mesa
// real.
const DEMO_CAMPAIGN = { id: 1, name: 'Mesa de demonstracao', inviteCode: 'MESADEMO' };

const DEMO_USERS = [
  { id: 1, name: 'Mestre do Cofre', email: 'mestre@lojarpg.local', passwordHash: mestreHash, role: 'MESTRE' },
  { id: 2, name: 'Aria', email: 'aria@lojarpg.local', passwordHash: jogadorHash, role: 'JOGADOR' },
  { id: 3, name: 'Borin', email: 'borin@lojarpg.local', passwordHash: jogadorHash, role: 'JOGADOR' },
  { id: 4, name: 'Lia', email: 'lia@lojarpg.local', passwordHash: jogadorHash, role: 'JOGADOR' }
];

const DEMO_EMAILS = DEMO_USERS.map((user) => user.email);

const TABLES_WITH_SERIAL_ID = [
  'users',
  'campaigns',
  'campaign_members',
  'characters',
  'categories',
  'rarities',
  'items',
  'inventory',
  'purchases',
  'purchase_items',
  'gold_audit_logs',
  'refresh_tokens',
  'stock_movements'
];

// Os dados iniciais usam ids fixos, que nao avancam as sequences do
// PostgreSQL; sem este ajuste o proximo registro criado pela API repetiria
// o id 1. O valor nunca volta para tras quando ha dados reais com ids maiores.
async function resetSequences(prisma) {
  for (const table of TABLES_WITH_SERIAL_ID) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
    );
  }
}

async function createDemoData(prisma) {
  const campaignId = DEMO_CAMPAIGN.id;

  await prisma.user.createMany({
    data: DEMO_USERS.map(({ role: _role, ...user }) => user)
  });

  await prisma.campaign.create({ data: DEMO_CAMPAIGN });

  await prisma.campaignMember.createMany({
    data: DEMO_USERS.map((user) => ({ campaignId, userId: user.id, role: user.role }))
  });

  await prisma.category.createMany({
    data: STARTER_CATEGORIES.map((name, index) => ({ id: index + 1, campaignId, name }))
  });

  await prisma.rarity.createMany({
    data: STARTER_RARITIES.map((rarity, index) => ({ id: index + 1, campaignId, ...rarity }))
  });

  await prisma.character.createMany({
    data: [
      { id: 1, campaignId, userId: 2, name: 'Aria Luaferro', className: 'Ladino', race: 'Elfo', level: 4, gold: 250 },
      { id: 2, campaignId, userId: 3, name: 'Borin Escudoforte', className: 'Guerreiro', race: 'Anao', level: 5, gold: 320 },
      { id: 3, campaignId, userId: 4, name: 'Lia Brasa', className: 'Maga', race: 'Humana', level: 3, gold: 180 }
    ]
  });

  await prisma.item.createMany({
    data: STARTER_ITEMS.map(({ category, rarity, ...item }, index) => ({
      ...item,
      id: index + 1,
      campaignId,
      categoryId: STARTER_CATEGORIES.indexOf(category) + 1,
      rarityId: STARTER_RARITIES.findIndex((entry) => entry.name === rarity) + 1,
      createdBy: 1
    }))
  });
}

// Recria so a demonstracao: a mesa MESADEMO, as contas de exemplo e as mesas
// que essas contas criaram. Mesas e contas reais continuam como estao.
export async function resetDemo(prisma) {
  await prisma.$transaction(
    async (tx) => {
      const demoCampaigns = await tx.campaign.findMany({
        where: {
          OR: [
            { inviteCode: DEMO_CAMPAIGN.inviteCode },
            { members: { some: { role: 'MESTRE', user: { email: { in: DEMO_EMAILS } } } } }
          ]
        },
        select: { id: true }
      });

      await deleteCampaigns(
        demoCampaigns.map((campaign) => campaign.id),
        tx
      );
      await tx.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });
      await createDemoData(tx);
    },
    { timeout: 30000 }
  );

  await resetSequences(prisma);
}

// Apaga o banco inteiro e cria a demonstracao. Usado pelos testes.
export async function seed(prisma) {
  await prisma.$transaction([
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.goldAuditLog.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.item.deleteMany(),
    prisma.character.deleteMany(),
    prisma.category.deleteMany(),
    prisma.rarity.deleteMany(),
    prisma.campaignMember.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.user.deleteMany()
  ]);

  await createDemoData(prisma);
  await resetSequences(prisma);
}

// `npm run db:seed`, `prisma migrate reset` e o inicio da API no Render
// (DEMO_RESET_ON_START) so mexem na demonstracao.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();

  resetDemo(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
