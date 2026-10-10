import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { withTransaction } from '../database/transaction.js';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken
} from '../models/refreshTokenModel.js';
import {
  createUser,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserById
} from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createOpaqueToken, daysFromNow, hashToken } from '../utils/tokens.js';

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function issueRefreshToken(userId, db) {
  const refreshToken = createOpaqueToken();
  await createRefreshToken(
    {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: daysFromNow(env.refreshTokenExpiresInDays)
    },
    db
  );
  return refreshToken;
}

function authPayload(user, refreshToken) {
  const accessToken = createAccessToken(user);

  return {
    user,
    accessToken,
    token: accessToken,
    refreshToken
  };
}

export async function registerUser(data) {
  const passwordHash = await hashPassword(data.password);

  return withTransaction(async (prisma) => {
    if (await findUserByEmail(data.email, prisma)) {
      throw new ApiError(409, 'Email já cadastrado.');
    }

    // A conta nao tem papel: quem cria uma mesa e o Mestre dela, e quem entra
    // por convite e jogador naquela mesa.
    const user = await createUser(
      {
        name: data.name,
        email: data.email,
        passwordHash
      },
      prisma
    );

    return authPayload(user, await issueRefreshToken(user.id, prisma));
  });
}

export async function loginUser(email, password) {
  const user = await findUserByEmailWithPassword(email);

  if (!user) {
    throw new ApiError(401, 'Email ou senha inválidos.');
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    throw new ApiError(401, 'Email ou senha inválidos.');
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };

  return withTransaction(async (prisma) => authPayload(safeUser, await issueRefreshToken(safeUser.id, prisma)));
}

export async function refreshSession(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new ApiError(401, 'Refresh token não informado.');
  }

  return withTransaction(async (prisma) => {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await findRefreshTokenByHash(tokenHash, prisma);

    if (!storedToken || storedToken.revokedAt || new Date(storedToken.expiresAt) <= new Date()) {
      throw new ApiError(401, 'Refresh token inválido ou expirado.');
    }

    // Com renovacoes simultaneas do mesmo token, todas passam pela checagem
    // acima, mas so uma consegue revoga-lo; as outras recebem 401 em vez de
    // ganhar um par de tokens novo cada.
    if ((await revokeRefreshToken(tokenHash, prisma)) !== 1) {
      throw new ApiError(401, 'Refresh token inválido ou expirado.');
    }

    const safeUser = await findUserById(storedToken.userId, prisma);

    if (!safeUser) {
      throw new ApiError(401, 'Usuário não encontrado.');
    }

    return authPayload(safeUser, await issueRefreshToken(safeUser.id, prisma));
  });
}

export async function logoutSession(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    return;
  }

  await revokeRefreshToken(hashToken(refreshToken));
}
