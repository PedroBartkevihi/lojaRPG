import { getPrisma } from '../database/connection.js';

function mapCategory(category) {
  return category
    ? {
        id: category.id,
        name: category.name,
        description: category.description,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    : null;
}

function mapRarity(rarity) {
  return rarity
    ? {
        id: rarity.id,
        name: rarity.name,
        rank: rarity.rank,
        description: rarity.description,
        createdAt: rarity.createdAt,
        updatedAt: rarity.updatedAt
      }
    : null;
}

export async function listCategories(prisma = getPrisma()) {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return categories.map(mapCategory);
}

export async function createCategory(data, prisma = getPrisma()) {
  return mapCategory(await prisma.category.create({ data }));
}

export async function updateCategory(id, data, prisma = getPrisma()) {
  return mapCategory(
    await prisma.category.update({
      where: { id: Number(id) },
      data: {
        ...data,
        updatedAt: new Date().toISOString()
      }
    })
  );
}

export async function deleteCategory(id, prisma = getPrisma()) {
  await prisma.category.delete({ where: { id: Number(id) } });
}

export async function listRarities(prisma = getPrisma()) {
  const rarities = await prisma.rarity.findMany({ orderBy: [{ rank: 'asc' }, { name: 'asc' }] });
  return rarities.map(mapRarity);
}

export async function createRarity(data, prisma = getPrisma()) {
  return mapRarity(await prisma.rarity.create({ data }));
}

export async function updateRarity(id, data, prisma = getPrisma()) {
  return mapRarity(
    await prisma.rarity.update({
      where: { id: Number(id) },
      data: {
        ...data,
        updatedAt: new Date().toISOString()
      }
    })
  );
}

export async function deleteRarity(id, prisma = getPrisma()) {
  await prisma.rarity.delete({ where: { id: Number(id) } });
}

export async function listStockMovements(filters = {}, prisma = getPrisma()) {
  const movements = await prisma.stockMovement.findMany({
    where: filters.itemId ? { itemId: Number(filters.itemId) } : {},
    include: {
      item: { select: { name: true } },
      actor: { select: { name: true } }
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });

  return movements.map((movement) => ({
    id: movement.id,
    itemId: movement.itemId,
    itemName: movement.item?.name,
    actorUserId: movement.actorUserId,
    actorName: movement.actor?.name,
    previousStock: movement.previousStock,
    newStock: movement.newStock,
    delta: movement.delta,
    reason: movement.reason,
    createdAt: movement.createdAt
  }));
}

export async function createStockMovement(data, prisma = getPrisma()) {
  return prisma.stockMovement.create({
    data: {
      itemId: Number(data.itemId),
      actorUserId: data.actorUserId ? Number(data.actorUserId) : null,
      previousStock: Number(data.previousStock),
      newStock: Number(data.newStock),
      delta: Number(data.newStock) - Number(data.previousStock),
      reason: data.reason
    }
  });
}
