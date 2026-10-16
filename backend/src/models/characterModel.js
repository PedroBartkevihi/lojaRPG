import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { getPrisma } from '../database/connection.js';

// Regra do livro do jogador: forca x 15 libras.
export const CARRY_PER_STRENGTH = 15;

export function mapCharacter(character) {
  if (!character) {
    return null;
  }

  return {
    id: character.id,
    campaignId: character.campaignId,
    userId: character.userId,
    userName: character.user?.name,
    userEmail: character.user?.email,
    name: character.name,
    className: character.className,
    race: character.race,
    level: character.level,
    strength: character.strength,
    carryCapacity: character.strength * CARRY_PER_STRENGTH,
    gold: Number(character.gold),
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

// So os personagens de quem ainda participa da mesa; os de um jogador
// removido ficam guardados e voltam se ele entrar de novo.
export async function listCharacters(campaignId, prisma = getPrisma()) {
  const characters = await prisma.character.findMany({
    where: {
      campaignId: Number(campaignId),
      user: { memberships: { some: { campaignId: Number(campaignId) } } }
    },
    include: includeUser,
    orderBy: [{ name: 'asc' }]
  });

  return characters.map(mapCharacter);
}

export async function findCharacterById(id, campaignId, prisma = getPrisma()) {
  return mapCharacter(
    await prisma.character.findFirst({
      where: { id: Number(id), campaignId: Number(campaignId) },
      include: includeUser
    })
  );
}

export async function findCharactersByUserId(userId, campaignId, prisma = getPrisma()) {
  const characters = await prisma.character.findMany({
    where: { userId: Number(userId), campaignId: Number(campaignId) },
    include: includeUser,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  return characters.map(mapCharacter);
}

export async function findCharacterByUserId(userId, campaignId, prisma = getPrisma()) {
  const character = await prisma.character.findFirst({
    where: { userId: Number(userId), campaignId: Number(campaignId) },
    include: includeUser,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  return mapCharacter(character);
}

export async function createCharacter(data, prisma = getPrisma()) {
  const character = await prisma.character.create({
    data: {
      campaignId: Number(data.campaignId),
      userId: Number(data.userId),
      name: data.name,
      className: data.className,
      race: data.race,
      level: Number(data.level),
      strength: Number(data.strength || 10),
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
      level: Number(data.level),
      strength: Number(data.strength || 10)
    },
    include: includeUser
  });

  return mapCharacter(character);
}

// Soma o peso do inventario de cada personagem (itens sem peso contam zero)
// e devolve os personagens com carriedWeight, em libras.
export async function withCarriedWeight(characters, prisma = getPrisma()) {
  if (characters.length === 0) {
    return characters;
  }

  const rows = await prisma.$queryRaw`
    SELECT inv.character_id AS id, COALESCE(SUM(inv.quantity * it.weight), 0)::float8 AS weight
    FROM inventory inv JOIN items it ON it.id = inv.item_id
    WHERE inv.character_id IN (${Prisma.join(characters.map((character) => character.id))})
    GROUP BY inv.character_id`;
  const weights = new Map(rows.map((row) => [row.id, Math.round(Number(row.weight) * 100) / 100]));

  return characters.map((character) => ({ ...character, carriedWeight: weights.get(character.id) || 0 }));
}

// Desconta o ouro so se o personagem ainda tiver saldo no momento da escrita.
export async function debitCharacterGold(id, amount, prisma = getPrisma()) {
  const result = await prisma.character.updateMany({
    where: { id: Number(id), gold: { gte: Number(amount) } },
    data: { gold: { decrement: Number(amount) } }
  });

  return result.count > 0;
}

// Soma ouro de forma atomica e retorna o saldo novo.
export async function creditCharacterGold(id, amount, prisma = getPrisma()) {
  const result = await prisma.character.updateMany({
    where: { id: Number(id), gold: { lte: Number.MAX_SAFE_INTEGER - amount } },
    data: { gold: { increment: amount } }
  });
  if (!result.count) throw new ApiError(400, 'O saldo excederia o limite permitido em PC.');
  const character = await prisma.character.findUnique({ where: { id: Number(id) }, select: { gold: true } });
  return Number(character.gold);
}

// Troca o ouro so se ele ainda for o valor lido antes da alteracao.
export async function replaceCharacterGold(id, expectedGold, newGold, prisma = getPrisma()) {
  const result = await prisma.character.updateMany({
    where: { id: Number(id), gold: Number(expectedGold) },
    data: { gold: Number(newGold) }
  });

  return result.count > 0;
}
