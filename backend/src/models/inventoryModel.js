import { getPrisma } from '../database/connection.js';
import { effectiveSellPrice } from './itemModel.js';

function mapInventoryItem(entry) {
  return {
    id: entry.id,
    characterId: entry.characterId,
    itemId: entry.itemId,
    quantity: entry.quantity,
    item: {
      id: entry.item.id,
      name: entry.item.name,
      category: entry.item.category?.name,
      rarity: entry.item.rarity?.name,
      description: entry.item.description,
      price: entry.item.price,
      effectiveSellPrice: effectiveSellPrice(entry.item),
      imageUrl: entry.item.imageUrl,
      isActive: Boolean(entry.item.isActive)
    }
  };
}

export async function listInventoryByCharacterId(characterId, prisma = getPrisma()) {
  const inventory = await prisma.inventory.findMany({
    where: { characterId: Number(characterId) },
    include: {
      item: {
        include: {
          category: true,
          rarity: true
        }
      }
    },
    orderBy: [{ item: { name: 'asc' } }]
  });

  return inventory.map(mapInventoryItem);
}

export async function addInventoryItem(characterId, itemId, quantity, prisma = getPrisma()) {
  await prisma.inventory.upsert({
    where: {
      characterId_itemId: {
        characterId: Number(characterId),
        itemId: Number(itemId)
      }
    },
    update: {
      quantity: {
        increment: Number(quantity)
      }
    },
    create: {
      characterId: Number(characterId),
      itemId: Number(itemId),
      quantity: Number(quantity)
    }
  });
}

// Tira unidades do inventario so se o personagem ainda tiver o bastante. A
// linha some quando a quantidade chega a zero, porque o banco exige
// quantidade positiva.
export async function removeInventoryItem(characterId, itemId, quantity, prisma = getPrisma()) {
  const where = { characterId: Number(characterId), itemId: Number(itemId) };
  const decremented = await prisma.inventory.updateMany({
    where: { ...where, quantity: { gt: Number(quantity) } },
    data: { quantity: { decrement: Number(quantity) } }
  });

  if (decremented.count > 0) {
    return true;
  }

  const removed = await prisma.inventory.deleteMany({ where: { ...where, quantity: Number(quantity) } });
  return removed.count > 0;
}

function mapInventoryLog(log) {
  return {
    id: log.id,
    type: log.type,
    characterId: log.characterId,
    characterName: log.character?.name,
    itemId: log.itemId,
    itemName: log.item?.name,
    actorUserId: log.actorUserId,
    actorName: log.actor?.name,
    quantity: log.quantity,
    unitPrice: log.unitPrice,
    total: log.quantity * log.unitPrice,
    reason: log.reason,
    createdAt: log.createdAt
  };
}

export async function createInventoryLog(data, prisma = getPrisma()) {
  await prisma.inventoryLog.create({
    data: {
      characterId: Number(data.characterId),
      itemId: Number(data.itemId),
      actorUserId: data.actorUserId ? Number(data.actorUserId) : null,
      type: data.type,
      quantity: Number(data.quantity),
      unitPrice: Number(data.unitPrice || 0),
      reason: data.reason || ''
    }
  });
}

export async function listInventoryLogs(filters, prisma = getPrisma()) {
  const logs = await prisma.inventoryLog.findMany({
    where: {
      character: { campaignId: Number(filters.campaignId) },
      ...(filters.characterId ? { characterId: Number(filters.characterId) } : {})
    },
    include: {
      character: { select: { name: true } },
      item: { select: { name: true } },
      actor: { select: { name: true } }
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50
  });

  return logs.map(mapInventoryLog);
}
