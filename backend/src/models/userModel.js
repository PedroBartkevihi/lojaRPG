import { getPrisma } from '../database/connection.js';

export function mapUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export async function createUser(data, prisma = getPrisma()) {
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash
    }
  });

  return mapUser(user);
}

export async function findUserById(id, prisma = getPrisma()) {
  return mapUser(await prisma.user.findUnique({ where: { id: Number(id) } }));
}

export async function findUserByEmail(email, prisma = getPrisma()) {
  return mapUser(await prisma.user.findUnique({ where: { email } }));
}

export async function findUserByEmailWithPassword(email, prisma = getPrisma()) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt
  };
}
