import { getPrisma } from '../database/connection.js';

function mapPurchase(purchase) {
  if (!purchase) {
    return null;
  }

  return {
    id: purchase.id,
    characterId: purchase.characterId,
    characterName: purchase.character?.name,
    userName: purchase.character?.user?.name,
    totalValue: purchase.totalValue,
    purchasedAt: purchase.purchasedAt,
    items: purchase.items.map((entry) => ({
      id: entry.id,
      itemId: entry.itemId,
      itemName: entry.item?.name,
      category: entry.item?.category?.name,
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      subtotal: entry.quantity * entry.unitPrice
    }))
  };
}

const includePurchase = {
  character: {
    include: {
      user: {
        select: {
          name: true
        }
      }
    }
  },
  items: {
    include: {
      item: {
        include: {
          category: true
        }
      }
    },
    orderBy: {
      id: 'asc'
    }
  }
};

export async function createPurchase(data, prisma = getPrisma()) {
  const purchase = await prisma.purchase.create({
    data: {
      characterId: Number(data.characterId),
      totalValue: Number(data.totalValue)
    },
    include: includePurchase
  });

  return mapPurchase(purchase);
}

export async function addPurchaseItem(data, prisma = getPrisma()) {
  await prisma.purchaseItem.create({
    data: {
      purchaseId: Number(data.purchaseId),
      itemId: Number(data.itemId),
      quantity: Number(data.quantity),
      unitPrice: Number(data.unitPrice)
    }
  });
}

export async function findPurchaseById(id, prisma = getPrisma()) {
  return mapPurchase(
    await prisma.purchase.findUnique({
      where: { id: Number(id) },
      include: includePurchase
    })
  );
}

export async function listPurchases(filters = {}, prisma = getPrisma()) {
  const purchases = await prisma.purchase.findMany({
    where: filters.characterId ? { characterId: Number(filters.characterId) } : {},
    include: includePurchase,
    orderBy: [{ purchasedAt: 'desc' }, { id: 'desc' }]
  });

  return purchases.map(mapPurchase);
}
