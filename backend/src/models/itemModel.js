import { getPrisma } from '../database/connection.js';
import { ApiError } from '../utils/ApiError.js';

// Quanto a loja paga por uma unidade, ou null se ela nao compra o item. Sem
// preco definido pelo Mestre, vale a regra do D&D 5e: metade do preco.
export function effectiveSellPrice(item) {
  if (!item.isSellable) {
    return null;
  }

  return item.sellPrice ?? Math.floor(item.price / 2);
}

function mapItem(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    campaignId: item.campaignId,
    name: item.name,
    categoryId: item.categoryId,
    category: item.category?.name,
    description: item.description,
    price: item.price,
    sellPrice: item.sellPrice,
    isSellable: item.isSellable,
    effectiveSellPrice: effectiveSellPrice(item),
    rarityId: item.rarityId,
    rarity: item.rarity?.name,
    rarityRank: item.rarity?.rank,
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

// Categoria e raridade sao sempre as da mesma mesa do item: um id de outra
// mesa e recusado e um nome novo vira uma categoria desta mesa.
async function resolveCategoryId(campaignId, value, prisma) {
  if (Number.isInteger(Number(value))) {
    const category = await prisma.category.findFirst({ where: { id: Number(value), campaignId } });

    if (!category) {
      throw new ApiError(400, 'Categoria inválida.');
    }

    return category.id;
  }

  const name = String(value).trim();
  const category = await prisma.category.upsert({
    where: { campaignId_name: { campaignId, name } },
    update: {},
    create: { campaignId, name }
  });

  return category.id;
}

async function resolveRarityId(campaignId, value, prisma) {
  if (Number.isInteger(Number(value))) {
    const rarity = await prisma.rarity.findFirst({ where: { id: Number(value), campaignId } });

    if (!rarity) {
      throw new ApiError(400, 'Raridade inválida.');
    }

    return rarity.id;
  }

  const name = String(value).trim();
  const rarity = await prisma.rarity.upsert({
    where: { campaignId_name: { campaignId, name } },
    update: {},
    create: { campaignId, name }
  });

  return rarity.id;
}

// Compara sem acentos nem maiusculas: "pocao" encontra "Poção".
function normalizeSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export async function listItems(filters, prisma = getPrisma()) {
  const where = { campaignId: Number(filters.campaignId) };

  if (!filters.includeInactive) {
    where.isActive = true;
  } else if (filters.status === 'active') {
    where.isActive = true;
  } else if (filters.status === 'inactive') {
    where.isActive = false;
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

  // O catalogo de uma mesa tem dezenas de itens, entao a busca roda aqui, onde
  // da para ignorar acentos sem depender de extensao do PostgreSQL.
  const term = filters.search ? normalizeSearch(filters.search) : '';
  return items.map(mapItem).filter((item) => !term || normalizeSearch(item.name).includes(term));
}

export async function findItemById(id, options, prisma = getPrisma()) {
  const where = { id: Number(id), campaignId: Number(options.campaignId) };
  const item = await prisma.item.findFirst({
    where: options.includeInactive ? where : { ...where, isActive: true },
    include: includeRelations
  });

  return mapItem(item);
}

export async function findItemsByIds(ids, campaignId, prisma = getPrisma()) {
  if (!ids.length) {
    return [];
  }

  const items = await prisma.item.findMany({
    where: { id: { in: ids.map(Number) }, campaignId: Number(campaignId) },
    include: includeRelations
  });

  return items.map(mapItem);
}

export async function createItem(data, prisma = getPrisma()) {
  const campaignId = Number(data.campaignId);
  const categoryId = await resolveCategoryId(campaignId, data.categoryId || data.category, prisma);
  const rarityId = await resolveRarityId(campaignId, data.rarityId || data.rarity, prisma);
  const item = await prisma.item.create({
    data: {
      campaignId,
      name: data.name,
      categoryId,
      rarityId,
      description: data.description || '',
      price: Number(data.price),
      sellPrice: data.sellPrice ?? null,
      isSellable: data.isSellable ?? true,
      stock: Number(data.stock),
      imageUrl: data.imageUrl || '',
      createdBy: data.createdBy ? Number(data.createdBy) : null
    },
    include: includeRelations
  });

  return mapItem(item);
}

export async function updateItem(id, data, prisma = getPrisma()) {
  const campaignId = Number(data.campaignId);
  const categoryId = await resolveCategoryId(campaignId, data.categoryId || data.category, prisma);
  const rarityId = await resolveRarityId(campaignId, data.rarityId || data.rarity, prisma);
  const item = await prisma.item.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      categoryId,
      rarityId,
      description: data.description || '',
      price: Number(data.price),
      sellPrice: data.sellPrice ?? null,
      isSellable: data.isSellable ?? true,
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

// Devolve itens ao estoque e retorna o estoque novo.
export async function incrementItemStock(id, quantity, prisma = getPrisma()) {
  const item = await prisma.item.update({
    where: { id: Number(id) },
    data: { stock: { increment: Number(quantity) } },
    select: { stock: true }
  });

  return item.stock;
}

// Troca o estoque so se ele ainda for o valor lido antes da edicao.
export async function replaceItemStock(id, expectedStock, newStock, prisma = getPrisma()) {
  const result = await prisma.item.updateMany({
    where: { id: Number(id), stock: Number(expectedStock) },
    data: { stock: Number(newStock) }
  });

  return result.count > 0;
}
