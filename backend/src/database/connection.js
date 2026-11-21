import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

// Limite conservador para uma instancia da API (Render gratuito + conexao
// direta no Neon), com folga para transacoes concorrentes e o /ready.
// O timeout evita espera infinita (padrao 0 do pg) e acompanha o /ready (5s).
const POOL_MAX = 5;
const CONNECTION_TIMEOUT_MS = 5000;

let prisma;

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  const adapter = new PrismaPg({
    connectionString,
    max: POOL_MAX,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS
  });

  return new PrismaClient({ adapter });
}

export function getPrisma() {
  if (!prisma) {
    prisma = createPrismaClient();
  }

  return prisma;
}

export async function closeDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
