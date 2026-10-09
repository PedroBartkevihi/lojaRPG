import { getPrisma } from '../database/connection.js';

function mapItem(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    category: item.category?.name,
    description: item.description,
    price: item.price,
    rarityId: item.rarityId,
    rarity: item.rarity?.name,
    stock: item.stock,
    imageUrl: item.imageUrl,
    createdBy: item.createdBy,
    createdByName: item.creator?.name,
    isActive: Boolean(item.isActive),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

const includeRelations = {
  category: true,
  rarity: true,
  creator: {
    select: {
      name: true
    }
  }
};

async function resolveCategoryId(value, prisma) {
  if (Number.isInteger(Number(value))) {
    return Number(value);
  }

  const category = await prisma.category.upsert({
    where: { name: String(value).trim() },
    update: {},
    create: { name: String(value).trim() }
  });

  return category.id;
}

async function resolveRarityId(value, prisma) {
  if (Number.isInteger(Number(value))) {
    return Number(value);
  }

  const rarity = await prisma.rarity.upsert({
    where: { name: String(value).trim() },
    update: {},
    create: { name: String(value).trim() }
  });

  return rarity.id;
}

export async function listItems(filters = {}, prisma = getPrisma()) {
  const where = {};

  if (!filters.includeInactive) {
    where.isActive = true;
  } else if (filters.status === 'active') {
    where.isActive = true;
  } else if (filters.status === 'inactive') {
    where.isActive = false;
  }

  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }

  if (filters.category) {
    where.category = { name: filters.category };
  }

  if (filters.rarity) {
    where.rarity = { name: filters.rarity };
  }

  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price.gte = Number(filters.minPrice);
    if (filters.maxPrice) where.price.lte = Number(filters.maxPrice);
  }

  const items = await prisma.item.findMany({
    where,
    include: includeRelations,
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }]
  });

  return items.map(mapItem);
}

export async function findItemById(id, options = {}, prisma = getPrisma()) {
  const where = { id: Number(id) };
  const item = await prisma.item.findFirst({
    where: options.includeInactive ? where : { ...where, isActive: true },
    include: includeRelations
  });

  return mapItem(item);
}

export async function findItemsByIds(ids, prisma = getPrisma()) {
  if (!ids.length) {
    return [];
  }

  const items = await prisma.item.findMany({
    where: { id: { in: ids.map(Number) } },
    include: includeRelations
  });

  return items.map(mapItem);
}

export async function createItem(data, prisma = getPrisma()) {
  const categoryId = await resolveCategoryId(data.categoryId || data.category, prisma);
  const rarityId = await resolveRarityId(data.rarityId || data.rarity, prisma);
  const item = await prisma.item.create({
    data: {
      name: data.name,
      categoryId,
      rarityId,
      description: data.description || '',
      price: Number(data.price),
      stock: Number(data.stock),
      imageUrl: data.imageUrl || '',
      createdBy: data.createdBy ? Number(data.createdBy) : null
    },
    include: includeRelations
  });

  return mapItem(item);
}

export async function updateItem(id, data, prisma = getPrisma()) {
  const categoryId = await resolveCategoryId(data.categoryId || data.category, prisma);
  const rarityId = await resolveRarityId(data.rarityId || data.rarity, prisma);
  const item = await prisma.item.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      categoryId,
      rarityId,
      description: data.description || '',
      price: Number(data.price),
      stock: Number(data.stock),
      imageUrl: data.imageUrl || ''
    },
    include: includeRelations
  });

  return mapItem(item);
}

export async function deactivateItem(id, prisma = getPrisma()) {
  const item = await prisma.item.update({
    where: { id: Number(id) },
    data: {
      isActive: false,
      stock: 0
    },
    include: includeRelations
  });

  return mapItem(item);
}

export async function reactivateItem(id, prisma = getPrisma()) {
  const item = await prisma.item.update({
    where: { id: Number(id) },
    data: {
      isActive: true
    },
    include: includeRelations
  });

  return mapItem(item);
}

// Retira do estoque so se o item continuar ativo e com unidades suficientes.
export async function decrementItemStock(id, quantity, prisma = getPrisma()) {
  const result = await prisma.item.updateMany({
    where: { id: Number(id), isActive: true, stock: { gte: Number(quantity) } },
    data: { stock: { decrement: Number(quantity) } }
  });

  return result.count > 0;
}

// Troca o estoque so se ele ainda for o valor lido antes da edicao.
export async function replaceItemStock(id, expectedStock, newStock, prisma = getPrisma()) {
  const result = await prisma.item.updateMany({
    where: { id: Number(id), stock: Number(expectedStock) },
    data: { stock: Number(newStock) }
  });

  return result.count > 0;
}
