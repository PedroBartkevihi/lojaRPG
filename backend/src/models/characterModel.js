import { getPrisma } from '../database/connection.js';

export function mapCharacter(character) {
  if (!character) {
    return null;
  }

  return {
    id: character.id,
    userId: character.userId,
    userName: character.user?.name,
    userEmail: character.user?.email,
    name: character.name,
    className: character.className,
    race: character.race,
    level: character.level,
    gold: character.gold,
    createdAt: character.createdAt
  };
}

const includeUser = {
  user: {
    select: {
      name: true,
      email: true
    }
  }
};

export async function listCharacters(prisma = getPrisma()) {
  const characters = await prisma.character.findMany({
    include: includeUser,
    orderBy: [{ name: 'asc' }]
  });

  return characters.map(mapCharacter);
}

export async function findCharacterById(id, prisma = getPrisma()) {
  return mapCharacter(
    await prisma.character.findUnique({
      where: { id: Number(id) },
      include: includeUser
    })
  );
}

export async function findCharactersByUserId(userId, prisma = getPrisma()) {
  const characters = await prisma.character.findMany({
    where: { userId: Number(userId) },
    include: includeUser,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  return characters.map(mapCharacter);
}

export async function findCharacterByUserId(userId, prisma = getPrisma()) {
  const character = await prisma.character.findFirst({
    where: { userId: Number(userId) },
    include: includeUser,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  return mapCharacter(character);
}

export async function createCharacter(data, prisma = getPrisma()) {
  const character = await prisma.character.create({
    data: {
      userId: Number(data.userId),
      name: data.name,
      className: data.className,
      race: data.race,
      level: Number(data.level),
      gold: Number(data.gold || 0)
    },
    include: includeUser
  });

  return mapCharacter(character);
}

export async function updateCharacter(id, data, prisma = getPrisma()) {
  const character = await prisma.character.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      className: data.className,
      race: data.race,
      level: Number(data.level)
    },
    include: includeUser
  });

  return mapCharacter(character);
}

// Desconta o ouro so se o personagem ainda tiver saldo no momento da escrita.
export async function debitCharacterGold(id, amount, prisma = getPrisma()) {
  const result = await prisma.character.updateMany({
    where: { id: Number(id), gold: { gte: Number(amount) } },
    data: { gold: { decrement: Number(amount) } }
  });

  return result.count > 0;
}

// Troca o ouro so se ele ainda for o valor lido antes da alteracao.
export async function replaceCharacterGold(id, expectedGold, newGold, prisma = getPrisma()) {
  const result = await prisma.character.updateMany({
    where: { id: Number(id), gold: Number(expectedGold) },
    data: { gold: Number(newGold) }
  });

  return result.count > 0;
}
