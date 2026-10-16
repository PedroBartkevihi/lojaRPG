import { getPrisma } from '../database/connection.js';
import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { findCharacterById } from '../models/characterModel.js';
import { ApiError } from '../utils/ApiError.js';

export { priceWithDiscount, sellPriceWithDiscount } from '../utils/pricing.js';

function mapDiscount(discount) {
  return {
    id: discount.id,
    name: discount.name,
    percent: discount.percent,
    categoryId: discount.categoryId,
    category: discount.category?.name ?? null,
    characterId: discount.characterId,
    characterName: discount.character?.name ?? null,
    isActive: discount.isActive,
    createdAt: discount.createdAt
  };
}

const includeDiscount = { category: { select: { name: true } }, character: { select: { name: true } } };

// Descontos ativos que valem para o personagem: os da mesa toda e os dele.
// Sem personagem (o Mestre olhando a vitrine), so os da mesa toda.
export async function activeDiscounts(campaignId, characterId, prisma = getPrisma()) {
  return prisma.priceDiscount.findMany({
    where: {
      campaignId,
      isActive: true,
      OR: [{ characterId: null }, ...(characterId ? [{ characterId }] : [])]
    },
    include: includeDiscount
  });
}

// O personagem da vitrine: o Mestre ve qualquer um da mesa; o jogador, so os
// proprios.
export async function resolveShopCharacter(req, characterId) {
  if (!characterId) {
    return null;
  }

  const character = await findCharacterById(characterId, req.campaign.id);

  if (!character) {
    throw new ApiError(404, 'Personagem não encontrado.');
  }

  if (!isGameMaster(req) && character.userId !== req.user.id) {
    throw new ApiError(403, 'Você só pode ver os preços dos seus personagens.');
  }

  return character;
}

export async function listDiscounts(req) {
  const where = { campaignId: req.campaign.id };

  if (!isGameMaster(req)) {
    // O jogador ve os eventos ativos da mesa e os descontos dos seus personagens.
    Object.assign(where, {
      isActive: true,
      OR: [{ characterId: null }, { character: { userId: req.user.id } }]
    });
  }

  const discounts = await getPrisma().priceDiscount.findMany({
    where,
    include: includeDiscount,
    orderBy: [{ isActive: 'desc' }, { id: 'desc' }]
  });

  return discounts.map(mapDiscount);
}

async function ensureInCampaign(campaignId, { categoryId, characterId }) {
  const prisma = getPrisma();

  if (categoryId && !(await prisma.category.findFirst({ where: { id: categoryId, campaignId } }))) {
    throw new ApiError(400, 'Categoria inválida.');
  }

  if (characterId && !(await prisma.character.findFirst({ where: { id: characterId, campaignId } }))) {
    throw new ApiError(400, 'Personagem inválido.');
  }
}

export async function createDiscount(campaignId, data) {
  await ensureInCampaign(campaignId, data);
  return mapDiscount(
    await getPrisma().priceDiscount.create({
      data: { campaignId, name: data.name, percent: data.percent, categoryId: data.categoryId ?? null, characterId: data.characterId ?? null },
      include: includeDiscount
    })
  );
}

async function findDiscount(campaignId, id) {
  const discount = await getPrisma().priceDiscount.findFirst({ where: { id, campaignId } });

  if (!discount) {
    throw new ApiError(404, 'Desconto não encontrado.');
  }

  return discount;
}

export async function setDiscountActive(campaignId, id, isActive) {
  await findDiscount(campaignId, id);
  return mapDiscount(await getPrisma().priceDiscount.update({ where: { id }, data: { isActive }, include: includeDiscount }));
}

export async function deleteDiscount(campaignId, id) {
  await findDiscount(campaignId, id);
  await getPrisma().priceDiscount.delete({ where: { id } });
}
