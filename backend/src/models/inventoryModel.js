import { getPrisma } from '../database/connection.js';

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
