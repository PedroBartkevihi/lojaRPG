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
    createdAt: token.createdAt
  };
}

export async function createRefreshToken(data, prisma = getPrisma()) {
  return mapRefreshToken(
    await prisma.refreshToken.create({
      data: {
        userId: Number(data.userId),
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt
      }
    })
  );
}

export async function findRefreshTokenByHash(tokenHash, prisma = getPrisma()) {
  return mapRefreshToken(await prisma.refreshToken.findUnique({ where: { tokenHash } }));
}

export async function revokeRefreshToken(tokenHash, prisma = getPrisma()) {
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date().toISOString()
    }
  });
}
