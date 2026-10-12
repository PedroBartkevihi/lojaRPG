import { getPrisma } from '../database/connection.js';
import { withTransaction } from '../database/transaction.js';
import { ApiError } from '../utils/ApiError.js';

// Iniciar/encerrar usa FOR UPDATE na mesa. Eventos usam FOR SHARE antes de
// qualquer saldo/estoque: o limite da sessao e consistente com o commit do evento.
export async function withCampaignTransaction(campaignId, action) {
  return withTransaction(async (prisma) => {
    const rows = await prisma.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR SHARE`;
    if (!rows.length) throw new ApiError(404, 'Mesa não encontrada.');
    const session = await prisma.campaignSession.findFirst({ where: { campaignId, endedAt: null } });
    return action(prisma, session?.id ?? null);
  });
}

export async function startSession(campaignId, notes) {
  return withTransaction(async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;
    if (await prisma.campaignSession.findFirst({ where: { campaignId, endedAt: null } })) {
      throw new ApiError(409, 'Já existe uma sessão aberta nesta mesa.');
    }
    const last = await prisma.campaignSession.aggregate({ where: { campaignId }, _max: { number: true } });
    return prisma.campaignSession.create({ data: { campaignId, number: (last._max.number || 0) + 1, notes } });
  });
}

export async function closeSession(campaignId, id, notes) {
  return withTransaction(async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;
    const session = await prisma.campaignSession.findFirst({ where: { id, campaignId } });
    if (!session) throw new ApiError(404, 'Sessão não encontrada.');
    if (session.endedAt) throw new ApiError(409, 'Esta sessão já foi encerrada.');
    return prisma.campaignSession.update({ where: { id }, data: { endedAt: new Date(), ...(notes !== undefined ? { notes } : {}) } });
  });
}

export async function sessionSummary(campaignId, id, prisma = getPrisma()) {
  const session = await prisma.campaignSession.findFirst({ where: { id, campaignId } });
  if (!session) throw new ApiError(404, 'Sessão não encontrada.');
  const [purchases, gold, movements] = await Promise.all([
    prisma.purchase.aggregate({ where: { sessionId: id, character: { campaignId } }, _sum: { totalValue: true }, _count: true }),
    prisma.goldAuditLog.aggregate({ where: { sessionId: id, character: { campaignId } }, _sum: { delta: true } }),
    prisma.$queryRaw`SELECT l.type, c.name AS "characterName", i.name AS "itemName",
      SUM(l.quantity)::text AS quantity, SUM(l.quantity::bigint * l.unit_price)::text AS value
      FROM inventory_logs l JOIN characters c ON c.id = l.character_id JOIN items i ON i.id = l.item_id
      WHERE l.session_id = ${id} AND c.campaign_id = ${campaignId}
      GROUP BY l.type, c.id, c.name, i.id, i.name ORDER BY c.name, i.name, l.type`
  ]);
  return { session, summary: { spent: purchases._sum.totalValue || 0, purchaseCount: purchases._count,
    goldChange: gold._sum.delta || 0,
    movements: movements.map((entry) => ({ ...entry, quantity: Number(entry.quantity), value: Number(entry.value) })) } };
}
