import { ROLES } from '../config/roles.js';
import { STARTER_CATEGORIES, STARTER_ITEMS, STARTER_RARITIES } from '../data/starterCatalog.js';
import { withTransaction } from '../database/transaction.js';
import {
  addMember,
  createCampaign as createCampaignRecord,
  deleteCampaigns,
  findCampaignByInviteCode,
  findMembership,
  removeMember as removeMemberRecord,
  updateInviteCode
} from '../models/campaignModel.js';
import { ApiError } from '../utils/ApiError.js';
import { createInviteCode } from '../utils/inviteCode.js';

// Com 32^8 combinacoes, repetir um codigo e improvavel; a conferencia evita
// que isso vire um erro de registro duplicado para quem cria a mesa.
async function generateUniqueInviteCode(prisma) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();

    if (!(await findCampaignByInviteCode(inviteCode, prisma))) {
      return inviteCode;
    }
  }

  throw new ApiError(503, 'Não foi possível gerar um código de convite. Tente novamente.');
}

async function copyStarterCatalog(campaignId, actorUserId, prisma) {
  await prisma.category.createMany({
    data: STARTER_CATEGORIES.map((name) => ({ campaignId, name }))
  });
  await prisma.rarity.createMany({
    data: STARTER_RARITIES.map((rarity) => ({ campaignId, ...rarity }))
  });

  const categories = await prisma.category.findMany({ where: { campaignId } });
  const rarities = await prisma.rarity.findMany({ where: { campaignId } });
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  const rarityIds = new Map(rarities.map((rarity) => [rarity.name, rarity.id]));

  await prisma.item.createMany({
    data: STARTER_ITEMS.map(({ category, rarity, ...item }) => ({
      ...item,
      campaignId,
      categoryId: categoryIds.get(category),
      rarityId: rarityIds.get(rarity),
      createdBy: actorUserId
    }))
  });
}

export async function createCampaign(user, data) {
  return withTransaction(async (prisma) => {
    const campaign = await createCampaignRecord(
      {
        name: data.name,
        inviteCode: await generateUniqueInviteCode(prisma)
      },
      prisma
    );

    await addMember({ campaignId: campaign.id, userId: user.id, role: ROLES.GAME_MASTER }, prisma);
    await copyStarterCatalog(campaign.id, user.id, prisma);

    return (await findMembership(campaign.id, user.id, prisma)).campaign;
  });
}

// Entrar de novo numa mesa em que ja participa nao muda nada; quem tinha sido
// removido volta com os personagens que tinha nela.
export async function joinCampaign(user, inviteCode) {
  return withTransaction(async (prisma) => {
    const campaign = await findCampaignByInviteCode(inviteCode, prisma);

    if (!campaign) {
      throw new ApiError(404, 'Código de convite inválido.');
    }

    const existing = await findMembership(campaign.id, user.id, prisma);

    if (existing) {
      return { campaign: existing.campaign, joined: false };
    }

    await addMember({ campaignId: campaign.id, userId: user.id, role: ROLES.PLAYER }, prisma);

    return {
      campaign: (await findMembership(campaign.id, user.id, prisma)).campaign,
      joined: true
    };
  });
}

export async function deleteCampaign(campaignId) {
  await withTransaction((prisma) => deleteCampaigns([campaignId], prisma));
}

export async function regenerateInviteCode(campaignId, userId) {
  return withTransaction(async (prisma) => {
    await updateInviteCode(campaignId, await generateUniqueInviteCode(prisma), prisma);
    return (await findMembership(campaignId, userId, prisma)).campaign;
  });
}

// O Mestre remove qualquer jogador; o jogador so pode remover a si mesmo, o
// que equivale a sair da mesa. Os personagens ficam guardados.
export async function removeMember(membership, targetUserId) {
  const isSelf = membership.userId === targetUserId;

  if (isSelf && membership.role === ROLES.GAME_MASTER) {
    throw new ApiError(400, 'O Mestre não pode sair da própria mesa. Para encerrar a mesa, exclua-a.');
  }

  if (!isSelf && membership.role !== ROLES.GAME_MASTER) {
    throw new ApiError(403, 'Acesso permitido apenas para Mestre.');
  }

  return withTransaction(async (prisma) => {
    if (!(await findMembership(membership.campaignId, targetUserId, prisma))) {
      throw new ApiError(404, 'Participante não encontrado.');
    }

    await removeMemberRecord(membership.campaignId, targetUserId, prisma);
  });
}
