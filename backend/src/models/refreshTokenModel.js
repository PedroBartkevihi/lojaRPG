import { getPrisma } from '../database/connection.js';

function mapRefreshToken(token) {
  if (!token) {
    return null;
  }

  return {
    id: token.id,
    userId: token.userId,
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
    sessionVersion: token.sessionVersion,
    createdAt: token.createdAt
  };
}

export async function createRefreshToken(data, prisma = getPrisma()) {
  return mapRefreshToken(
    await prisma.refreshToken.create({
      data: {
        userId: Number(data.userId),
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        sessionVersion: data.sessionVersion
      }
    })
  );
}

export async function findRefreshTokenByHash(tokenHash, prisma = getPrisma()) {
  return mapRefreshToken(await prisma.refreshToken.findUnique({ where: { tokenHash } }));
}

// Devolve quantos tokens foram revogados agora: 0 se ele ja estava revogado.
export async function revokeRefreshToken(tokenHash, prisma = getPrisma()) {
  const { count } = await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date().toISOString()
    }
  });

  return count;
}

// Apaga os tokens vencidos e os revogados ha mais de uma hora (a folga cobre
// uma renovacao que ainda esteja terminando). Cada login cria um token, entao
// sem a limpeza a tabela so cresce. Devolve quantos foram apagados.
export async function deleteStaleRefreshTokens(now = new Date(), prisma = getPrisma()) {
  const revokedBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: revokedBefore } }]
    }
  });

  return count;
}
