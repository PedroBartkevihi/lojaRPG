import { getPrisma } from '../database/connection.js';

function mapGoldAuditLog(log) {
  if (!log) {
    return null;
  }

  return {
    id: log.id,
    actorUserId: log.actorUserId,
    actorName: log.actor?.name,
    characterId: log.characterId,
    characterName: log.character?.name,
    previousGold: log.previousGold,
    newGold: log.newGold,
    delta: log.delta,
    reason: log.reason,
    createdAt: log.createdAt
  };
}

const includeAudit = {
  actor: {
    select: {
      name: true
    }
  },
  character: {
    select: {
      name: true
    }
  }
};

export async function createGoldAuditLog(data, prisma = getPrisma()) {
  const log = await prisma.goldAuditLog.create({
    data: {
      actorUserId: Number(data.actorUserId),
      characterId: Number(data.characterId),
      previousGold: Number(data.previousGold),
      newGold: Number(data.newGold),
      delta: Number(data.delta),
      reason: data.reason
    },
    include: includeAudit
  });

  return mapGoldAuditLog(log);
}

export async function listGoldAuditLogs(filters = {}, prisma = getPrisma()) {
  const logs = await prisma.goldAuditLog.findMany({
    where: filters.characterId ? { characterId: Number(filters.characterId) } : {},
    include: includeAudit,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });

  return logs.map(mapGoldAuditLog);
}
