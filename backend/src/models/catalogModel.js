import { getPrisma } from '../database/connection.js';
import { ApiError } from '../utils/ApiError.js';

const FALLBACK_CATEGORY_NAME = 'Sem categoria';
const FALLBACK_RARITY_NAME = 'Comum';
const withItemCount = { _count: { select: { items: true } } };

function mapCategory(category) {
  return category
    ? {
        id: category.id,
        name: category.name,
        description: category.description,
        itemCount: category._count?.items || 0,
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
        itemCount: rarity._count?.items || 0,
        createdAt: rarity.createdAt,
        updatedAt: rarity.updatedAt
      }
    : null;
}

// Um id de outra mesa responde como inexistente.
async function findCategoryInCampaign(campaignId, id, prisma) {
  const category = await prisma.category.findFirst({
    where: { id: Number(id), campaignId: Number(campaignId) },
    include: withItemCount
  });

  if (!category) {
    throw new ApiError(404, 'Categoria nao encontrada.');
  }

  return category;
}

async function findRarityInCampaign(campaignId, id, prisma) {
  const rarity = await prisma.rarity.findFirst({
    where: { id: Number(id), campaignId: Number(campaignId) },
    include: withItemCount
  });

  if (!rarity) {
    throw new ApiError(404, 'Raridade nao encontrada.');
  }

  return rarity;
}

export async function listCategories(campaignId, prisma = getPrisma()) {
  const categories = await prisma.category.findMany({
    where: { campaignId: Number(campaignId) },
    include: withItemCount,
    orderBy: { name: 'asc' }
  });
  return categories.map(mapCategory);
}

export async function createCategory(campaignId, data, prisma = getPrisma()) {
  return mapCategory(
    await prisma.category.create({ data: { ...data, campaignId: Number(campaignId) }, include: withItemCount })
  );
}

export async function updateCategory(campaignId, id, data, prisma = getPrisma()) {
  await findCategoryInCampaign(campaignId, id, prisma);

  return mapCategory(
    await prisma.category.update({
      where: { id: Number(id) },
      data: {
        ...data,
        updatedAt: new Date().toISOString()
      },
      include: withItemCount
    })
  );
}

export async function deleteCategory(campaignId, id, prisma = getPrisma()) {
  const categoryId = Number(id);

  return prisma.$transaction(async (tx) => {
    const category = await findCategoryInCampaign(campaignId, categoryId, tx);

    let movedItems = 0;
    let fallbackCategory = null;

    if (category._count.items > 0) {
      if (category.name === FALLBACK_CATEGORY_NAME) {
        throw new ApiError(409, 'Nao e possivel remover Sem categoria enquanto existem itens vinculados.');
      }

      fallbackCategory = await tx.category.upsert({
        where: { campaignId_name: { campaignId: category.campaignId, name: FALLBACK_CATEGORY_NAME } },
        update: { updatedAt: new Date().toISOString() },
        create: { campaignId: category.campaignId, name: FALLBACK_CATEGORY_NAME }
      });

      const result = await tx.item.updateMany({
        where: { categoryId },
        data: {
          categoryId: fallbackCategory.id,
          updatedAt: new Date().toISOString()
        }
      });
      movedItems = result.count;
    }

    await tx.category.delete({ where: { id: categoryId } });

    return {
      movedItems,
      fallbackCategory: mapCategory(fallbackCategory)
    };
  });
}

export async function listRarities(campaignId, prisma = getPrisma()) {
  const rarities = await prisma.rarity.findMany({
    where: { campaignId: Number(campaignId) },
    include: withItemCount,
    orderBy: [{ rank: 'asc' }, { name: 'asc' }]
  });
  return rarities.map(mapRarity);
}

export async function createRarity(campaignId, data, prisma = getPrisma()) {
  return mapRarity(
    await prisma.rarity.create({ data: { ...data, campaignId: Number(campaignId) }, include: withItemCount })
  );
}

export async function updateRarity(campaignId, id, data, prisma = getPrisma()) {
  await findRarityInCampaign(campaignId, id, prisma);

  return mapRarity(
    await prisma.rarity.update({
      where: { id: Number(id) },
      data: {
        ...data,
        updatedAt: new Date().toISOString()
      },
      include: withItemCount
    })
  );
}

export async function deleteRarity(campaignId, id, prisma = getPrisma()) {
  const rarityId = Number(id);

  return prisma.$transaction(async (tx) => {
    const rarity = await findRarityInCampaign(campaignId, rarityId, tx);

    let movedItems = 0;
    let fallbackRarity = null;

    if (rarity._count.items > 0) {
      if (rarity.name === FALLBACK_RARITY_NAME) {
        throw new ApiError(409, 'Nao e possivel remover Comum enquanto existem itens vinculados.');
      }

      fallbackRarity = await tx.rarity.upsert({
        where: { campaignId_name: { campaignId: rarity.campaignId, name: FALLBACK_RARITY_NAME } },
        update: { updatedAt: new Date().toISOString() },
        create: { campaignId: rarity.campaignId, name: FALLBACK_RARITY_NAME, rank: 1 }
      });

      const result = await tx.item.updateMany({
        where: { rarityId },
        data: {
          rarityId: fallbackRarity.id,
          updatedAt: new Date().toISOString()
        }
      });
      movedItems = result.count;
    }

    await tx.rarity.delete({ where: { id: rarityId } });

    return {
      movedItems,
      fallbackRarity: mapRarity(fallbackRarity)
    };
  });
}

export async function listStockMovements(filters, prisma = getPrisma()) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      item: { campaignId: Number(filters.campaignId) },
      ...(filters.itemId ? { itemId: Number(filters.itemId) } : {})
    },
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
