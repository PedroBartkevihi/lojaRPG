import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import { createCharacter } from '../models/characterModel.js';
import { countUsers, createUser, findUserByEmail, findUserByEmailWithPassword } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export async function registerUser(data) {
  const passwordHash = await hashPassword(data.password);

  return withTransaction((db) => {
    if (findUserByEmail(data.email, db)) {
      throw new ApiError(409, 'Email ja cadastrado.');
    }

    if (data.role === ROLES.GAME_MASTER && countUsers(db) > 0 && data.masterKey !== env.masterRegistrationKey) {
      throw new ApiError(403, 'Chave de cadastro de Mestre invalida.');
    }

    const user = createUser(
      {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role
      },
      db
    );

    const character =
      data.role === ROLES.PLAYER && data.character
        ? createCharacter(
            {
              ...data.character,
              userId: user.id,
              gold: 0
            },
            db
          )
        : null;

    return {
      user,
      character,
      token: createToken(user)
    };
  });
}

export async function loginUser(email, password) {
  const user = findUserByEmailWithPassword(email);

  if (!user) {
    throw new ApiError(401, 'Email ou senha invalidos.');
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    throw new ApiError(401, 'Email ou senha invalidos.');
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };

  return {
    user: safeUser,
    token: createToken(safeUser)
  };
}
