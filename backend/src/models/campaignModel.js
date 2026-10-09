import { ROLES } from '../config/roles.js';
import { getPrisma } from '../database/connection.js';

// O codigo de convite so aparece para o Mestre, que decide com quem dividi-lo.
export function mapCampaign(campaign, role) {
  if (!campaign) {
    return null;
  }

  return {
    id: campaign.id,
    name: campaign.name,
    role,
    inviteCode: role === ROLES.GAME_MASTER ? campaign.inviteCode : undefined,
    memberCount: campaign._count?.members,
    createdAt: campaign.createdAt
  };
}

function mapMembership(membership) {
  if (!membership) {
    return null;
  }

  return {
    campaignId: membership.campaignId,
    userId: membership.userId,
    role: membership.role,
    joinedAt: membership.joinedAt,
    campaign: mapCampaign(membership.campaign, membership.role)
  };
}

const withMemberCount = { _count: { select: { members: true } } };

export async function listCampaignsByUserId(userId, prisma = getPrisma()) {
  const memberships = await prisma.campaignMember.findMany({
    where: { userId: Number(userId) },
    include: { campaign: { include: withMemberCount } },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }]
  });

  return memberships.map((membership) => mapCampaign(membership.campaign, membership.role));
}

export async function findMembership(campaignId, userId, prisma = getPrisma()) {
  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId: Number(campaignId), userId: Number(userId) } },
    include: { campaign: { include: withMemberCount } }
  });

  return mapMembership(membership);
}

export async function findCampaignByInviteCode(inviteCode, prisma = getPrisma()) {
  return prisma.campaign.findUnique({ where: { inviteCode } });
}

export async function createCampaign(data, prisma = getPrisma()) {
  return prisma.campaign.create({
    data: {
      name: data.name,
      inviteCode: data.inviteCode
    }
  });
}

export async function updateInviteCode(campaignId, inviteCode, prisma = getPrisma()) {
  return prisma.campaign.update({
    where: { id: Number(campaignId) },
    data: { inviteCode }
  });
}

// Compras e inventario apontam para os itens com RESTRICT, e os itens para
// categorias e raridades. A cascata a partir da mesa nao garante essa ordem,
// entao as linhas que dependem dos itens saem antes, e os itens antes da mesa.
// Rode dentro de uma transacao.
export async function deleteCampaigns(campaignIds, prisma = getPrisma()) {
  const ids = campaignIds.map(Number);

  await prisma.purchaseItem.deleteMany({ where: { item: { campaignId: { in: ids } } } });
  await prisma.inventory.deleteMany({ where: { item: { campaignId: { in: ids } } } });
  await prisma.item.deleteMany({ where: { campaignId: { in: ids } } });
  await prisma.campaign.deleteMany({ where: { id: { in: ids } } });
}

export async function addMember(data, prisma = getPrisma()) {
  await prisma.campaignMember.create({
    data: {
      campaignId: Number(data.campaignId),
      userId: Number(data.userId),
      role: data.role
    }
  });
}

export async function removeMember(campaignId, userId, prisma = getPrisma()) {
  await prisma.campaignMember.delete({
    where: { campaignId_userId: { campaignId: Number(campaignId), userId: Number(userId) } }
  });
}

// Lista o Mestre primeiro e depois os jogadores por ordem de entrada, cada um
// com os personagens que tem nesta mesa.
export async function listMembers(campaignId, prisma = getPrisma()) {
  const members = await prisma.campaignMember.findMany({
    where: { campaignId: Number(campaignId) },
    include: {
      user: {
        select: {
          name: true,
          characters: {
            where: { campaignId: Number(campaignId) },
            select: { id: true, name: true, className: true, race: true, level: true },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
          }
        }
      }
    },
    orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }, { id: 'asc' }]
  });

  return members.map((member) => ({
    userId: member.userId,
    name: member.user.name,
    role: member.role,
    joinedAt: member.joinedAt,
    characters: member.user.characters
  }));
}
