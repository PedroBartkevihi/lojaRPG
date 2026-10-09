import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';

const mestreHash =
  'scrypt$Wbrr8428uiTv9A82oz_n7Q$q4GLTusqxv1L8sy0P_An9-0XFVEMDgjeAeKzIqG2csfRzZXJdCzS4JgTPkxmuajrGJE8sC8KixTHeYxSmXp4ZQ';
const jogadorHash =
  'scrypt$Gdmi6YDLw8iKOumNo2qzXg$-Rhg5Lk41RnMYNVls-hSFvtP-4CPVvFb-xDIX-LYUdsPJBcwVrThUuI2gseZQKLQATSdlBODuHjeQXWi_6eyWA';

const TABLES_WITH_SERIAL_ID = [
  'users',
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
// o id 1.
async function resetSequences(prisma) {
  for (const table of TABLES_WITH_SERIAL_ID) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
    );
  }
}

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
    prisma.user.deleteMany()
  ]);

  await prisma.user.createMany({
    data: [
      { id: 1, name: 'Mestre do Cofre', email: 'mestre@lojarpg.local', passwordHash: mestreHash, role: 'MESTRE' },
      { id: 2, name: 'Aria', email: 'aria@lojarpg.local', passwordHash: jogadorHash, role: 'JOGADOR' },
      { id: 3, name: 'Borin', email: 'borin@lojarpg.local', passwordHash: jogadorHash, role: 'JOGADOR' },
      { id: 4, name: 'Lia', email: 'lia@lojarpg.local', passwordHash: jogadorHash, role: 'JOGADOR' }
    ]
  });

  await prisma.category.createMany({
    data: [
      { id: 1, name: 'Armas' },
      { id: 2, name: 'Armaduras' },
      { id: 3, name: 'Pocoes' },
      { id: 4, name: 'Magicos' },
      { id: 5, name: 'Equipamentos' }
    ]
  });

  await prisma.rarity.createMany({
    data: [
      { id: 1, name: 'Comum', rank: 1 },
      { id: 2, name: 'Incomum', rank: 2 },
      { id: 3, name: 'Raro', rank: 3 }
    ]
  });

  await prisma.character.createMany({
    data: [
      { id: 1, userId: 2, name: 'Aria Luaferro', className: 'Ladino', race: 'Elfo', level: 4, gold: 250 },
      { id: 2, userId: 3, name: 'Borin Escudoforte', className: 'Guerreiro', race: 'Anao', level: 5, gold: 320 },
      { id: 3, userId: 4, name: 'Lia Brasa', className: 'Maga', race: 'Humana', level: 3, gold: 180 }
    ]
  });

  await prisma.item.createMany({
    data: [
      { id: 1, name: 'Espada Longa', categoryId: 1, rarityId: 1, description: 'Uma lamina confiavel para duelos e masmorras.', price: 75, stock: 5, createdBy: 1 },
      { id: 2, name: 'Arco Curto', categoryId: 1, rarityId: 1, description: 'Arco simples, leve e facil de carregar.', price: 45, stock: 6, createdBy: 1 },
      { id: 3, name: 'Adaga de Prata', categoryId: 1, rarityId: 2, description: 'Boa contra criaturas sensiveis a prata.', price: 60, stock: 3, createdBy: 1 },
      { id: 4, name: 'Armadura de Couro Batido', categoryId: 2, rarityId: 1, description: 'Protecao leve para aventureiros discretos.', price: 90, stock: 4, createdBy: 1 },
      { id: 5, name: 'Escudo Reforcado', categoryId: 2, rarityId: 1, description: 'Escudo de madeira com aro metalico.', price: 55, stock: 4, createdBy: 1 },
      { id: 6, name: 'Pocao de Cura', categoryId: 3, rarityId: 1, description: 'Recupera energia vital em momentos perigosos.', price: 50, stock: 12, createdBy: 1 },
      { id: 7, name: 'Pocao de Invisibilidade', categoryId: 3, rarityId: 3, description: 'Concede invisibilidade por curto periodo.', price: 220, stock: 2, createdBy: 1 },
      { id: 8, name: 'Pergaminho de Bola de Fogo', categoryId: 4, rarityId: 3, description: 'Pergaminho arcano de uso unico.', price: 180, stock: 2, createdBy: 1 },
      { id: 9, name: 'Anel de Protecao Menor', categoryId: 4, rarityId: 3, description: 'Um anel simples com runas protetoras.', price: 260, stock: 1, createdBy: 1 },
      { id: 10, name: 'Kit de Aventureiro', categoryId: 5, rarityId: 1, description: 'Corda, pederneira, tocha e pequenas ferramentas.', price: 35, stock: 8, createdBy: 1 }
    ]
  });

  await resetSequences(prisma);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();

  seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
