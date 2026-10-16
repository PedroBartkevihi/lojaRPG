import jwt from 'jsonwebtoken';
import { isDemoAccount } from '../config/demo.js';
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
  findSessionUser,
  findUserByEmailWithPassword
} from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createOpaqueToken, daysFromNow, hashToken } from '../utils/tokens.js';

// Os dois tokens levam a versao da sessao da conta (sv). A troca de senha
// sobe a versao, e o authenticate e a renovacao recusam a versao antiga.
// Isso vale tambem para um login ou uma renovacao que correu junto com a
// troca: a versao lida antes dela fica velha assim que ela termina.
function createAccessToken(user, sessionVersion) {
  return jwt.sign(
    {
      sub: user.id,
      sv: sessionVersion
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function issueRefreshToken(userId, sessionVersion, db) {
  const refreshToken = createOpaqueToken();
  await createRefreshToken(
    {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: daysFromNow(env.refreshTokenExpiresInDays),
      sessionVersion
    },
    db
  );
  return refreshToken;
}

async function startSession(user, sessionVersion, db) {
  const refreshToken = await issueRefreshToken(user.id, sessionVersion, db);
  const accessToken = createAccessToken(user, sessionVersion);

  return {
    // isDemo deixa o front esconder o que a conta de demonstracao nao pode fazer.
    user: { ...user, isDemo: isDemoAccount(user) },
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

    // Conta nova comeca na versao 0, o padrao da coluna.
    return startSession(user, 0, prisma);
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

  // A versao foi lida junto com a senha conferida.
  return withTransaction(async (prisma) => startSession(safeUser, user.sessionVersion, prisma));
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

    const session = await findSessionUser(storedToken.userId, prisma);

    if (!session) {
      throw new ApiError(401, 'Usuário não encontrado.');
    }

    // Token de antes de uma troca de senha, inclusive um emitido por uma
    // renovacao que correu junto com ela: a sessao acabou.
    if (storedToken.sessionVersion !== session.sessionVersion) {
      throw new ApiError(401, 'Refresh token inválido ou expirado.');
    }

    return startSession(session.user, session.sessionVersion, prisma);
  });
}

export async function logoutSession(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    return;
  }

  await revokeRefreshToken(hashToken(refreshToken));
}
