import { withCampaignTransaction } from './sessionService.js';
import { getPrisma } from '../database/connection.js';
import { withTransaction } from '../database/transaction.js';
import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { debitCharacterGold, findCharacterById } from '../models/characterModel.js';
import { addInventoryItem } from '../models/inventoryModel.js';
import { createItem, findItemById } from '../models/itemModel.js';
import { addPurchaseItem, createPurchase } from '../models/purchaseModel.js';
import { ApiError } from '../utils/ApiError.js';

// Encomendas em aberto por jogador em cada mesa (somando os personagens): o
// bastante para a mesa, sem virar lista infinita de pedidos.
const MAX_PENDING_PER_PLAYER = 10;
// Teto da lista de pendentes, para a resposta ter tamanho maximo mesmo numa
// mesa cheia.
const MAX_PENDING_LISTED = 200;
const ANSWERED_MESSAGE = 'Esta encomenda já foi respondida. Atualize a lista.';

function mapRequest(request) {
  return {
    id: request.id,
    campaignId: request.campaignId,
    characterId: request.characterId,
    characterName: request.character?.name,
    userName: request.character?.user?.name,
    description: request.description,
    maxPrice: Number(request.maxPrice),
    status: request.status,
    price: request.price === null ? null : Number(request.price),
    itemId: request.itemId,
    itemName: request.item?.name,
    purchaseId: request.purchaseId,
    masterNote: request.masterNote,
    createdAt: request.createdAt,
    decidedAt: request.decidedAt
  };
}

const includeRequest = {
  character: { select: { name: true, userId: true, user: { select: { name: true } } } },
  item: { select: { name: true } }
};

// So conta a encomenda de quem ainda esta na mesa: quem saiu (ou foi
// removido) nao ve nem cancela mais, entao o Mestre tambem nao responde.
function memberCharacter(campaignId) {
  return { user: { memberships: { some: { campaignId } } } };
}

// Pendentes primeiro (as mais antigas no topo, para o Mestre responder na
// ordem), depois as respondidas mais recentes.
export async function listItemRequests(req) {
  const where = { campaignId: req.campaign.id };

  if (!isGameMaster(req)) {
    where.character = { userId: req.user.id };
  } else {
    where.character = memberCharacter(req.campaign.id);
  }

  const prisma = getPrisma();
  const [pending, answered] = await Promise.all([
    prisma.itemRequest.findMany({
      where: { ...where, status: 'PENDENTE' },
      include: includeRequest,
      orderBy: { id: 'asc' },
      take: MAX_PENDING_LISTED
    }),
    prisma.itemRequest.findMany({
      where: { ...where, status: { not: 'PENDENTE' } },
      include: includeRequest,
      orderBy: [{ decidedAt: 'desc' }, { id: 'desc' }],
      take: 50
    })
  ]);

  return [...pending, ...answered].map(mapRequest);
}

export async function createItemRequest({ user, campaignId, characterId, description, maxPrice }) {
  return withTransaction(async (prisma) => {
    const character = await findCharacterById(characterId, campaignId, prisma);

    if (!character) {
      throw new ApiError(404, 'Personagem não encontrado.');
    }

    if (character.userId !== user.id) {
      throw new ApiError(403, 'Você só pode encomendar para os seus personagens.');
    }

    // A trava na participacao faz pedidos simultaneos do mesmo jogador
    // contarem um depois do outro, sem passar do limite.
    await prisma.$queryRaw`SELECT id FROM campaign_members WHERE campaign_id = ${campaignId} AND user_id = ${user.id} FOR UPDATE`;
    const pending = await prisma.itemRequest.count({
      where: { campaignId, status: 'PENDENTE', character: { userId: user.id } }
    });

    if (pending >= MAX_PENDING_PER_PLAYER) {
      throw new ApiError(409, `Você já tem ${pending} encomendas esperando o Mestre nesta mesa. Cancele uma ou espere a resposta.`);
    }

    return mapRequest(
      await prisma.itemRequest.create({
        data: { campaignId, characterId, requestedBy: user.id, description, maxPrice },
        include: includeRequest
      })
    );
  });
}

async function findRequest(campaignId, requestId, prisma = getPrisma()) {
  const request = await prisma.itemRequest.findFirst({ where: { id: requestId, campaignId }, include: includeRequest });

  if (!request) {
    throw new ApiError(404, 'Encomenda não encontrada.');
  }

  return request;
}

// Troca o status so se a encomenda ainda estiver pendente: duas respostas ao
// mesmo tempo (ou uma resposta e o cancelamento) nao passam as duas.
async function closePending(prisma, requestId, data) {
  const { count } = await prisma.itemRequest.updateMany({
    where: { id: requestId, status: 'PENDENTE' },
    data: { ...data, decidedAt: new Date() }
  });

  if (count !== 1) {
    throw new ApiError(409, ANSWERED_MESSAGE);
  }
}

export async function cancelItemRequest({ user, campaignId, requestId }) {
  const request = await findRequest(campaignId, requestId);

  if (request.character.userId !== user.id) {
    throw new ApiError(403, 'Só quem encomendou pode cancelar.');
  }

  await closePending(getPrisma(), requestId, { status: 'CANCELADA' });
  return mapRequest(await findRequest(campaignId, requestId));
}

export async function rejectItemRequest({ campaignId, requestId, note }) {
  await findRequest(campaignId, requestId);
  await closePending(getPrisma(), requestId, { status: 'RECUSADA', masterNote: note });
  return mapRequest(await findRequest(campaignId, requestId));
}

// Aprovar e cobrar e entregar numa transacao so: o status muda primeiro (e so
// uma resposta passa), o ouro sai com o mesmo debito condicional da compra, e
// a encomenda vira uma compra no historico e no diario da sessao. Se faltar
// ouro, tudo volta e a encomenda continua pendente.
export async function approveItemRequest({ actorUserId, campaignId, requestId, price, itemId, newItem, note }) {
  return withCampaignTransaction(campaignId, async (prisma, sessionId) => {
    const request = await findRequest(campaignId, requestId, prisma);

    if (request.status !== 'PENDENTE') {
      throw new ApiError(409, ANSWERED_MESSAGE);
    }

    const member = await prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: request.character.userId } }
    });

    if (!member) {
      throw new ApiError(409, 'O dono deste personagem não está mais na mesa.');
    }

    if (price > Number(request.maxPrice)) {
      throw new ApiError(400, 'O preço passa do valor máximo que o jogador aceitou pagar. Recuse com uma nota ou peça um novo pedido.');
    }

    await closePending(prisma, requestId, { status: 'APROVADA', price, masterNote: note });

    let item;

    if (itemId) {
      item = await findItemById(itemId, { campaignId, includeInactive: true }, prisma);

      if (!item) {
        throw new ApiError(404, 'Item não encontrado nesta mesa.');
      }

      // Abaixo do que a loja paga, o jogador revenderia o item com lucro.
      if (item.effectiveSellPrice !== null && price < item.effectiveSellPrice) {
        throw new ApiError(
          400,
          `A loja compra ${item.name} por ${item.effectiveSellPrice} PC. Cobre pelo menos isso ou entregue um item novo.`
        );
      }
    } else {
      // O item da encomenda e feito sob medida: entra no catalogo fora da loja
      // (inativo e sem estoque), para aparecer nos historicos sem ficar a venda.
      const created = await createItem(
        { ...newItem, campaignId, price, stock: 0, createdBy: actorUserId },
        prisma
      );
      await prisma.item.update({ where: { id: created.id }, data: { isActive: false } });
      item = created;
    }

    if (!(await debitCharacterGold(request.characterId, price, prisma))) {
      const character = await findCharacterById(request.characterId, campaignId, prisma);
      throw new ApiError(400, `${character.name} não tem moedas suficientes para pagar a encomenda.`);
    }

    const purchase = await createPurchase({ sessionId, characterId: request.characterId, totalValue: price }, prisma);
    await addPurchaseItem({ purchaseId: purchase.id, itemId: item.id, quantity: 1, unitPrice: price }, prisma);
    await addInventoryItem(request.characterId, item.id, 1, prisma);
    await prisma.itemRequest.update({ where: { id: requestId }, data: { itemId: item.id, purchaseId: purchase.id } });

    return mapRequest(await findRequest(campaignId, requestId, prisma));
  });
}
