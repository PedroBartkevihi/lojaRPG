import { createHash } from 'node:crypto';
import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import { createStockMovement } from '../models/catalogModel.js';
import { debitCharacterGold, findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { addInventoryItem } from '../models/inventoryModel.js';
import { decrementItemStock, findItemsByIds } from '../models/itemModel.js';
import { addPurchaseItem, createPurchase, findPurchaseById } from '../models/purchaseModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { cartSchema, idempotencyKeySchema } from '../schemas/purchaseSchemas.js';
import { ApiError } from '../utils/ApiError.js';
import { parse } from '../utils/validation.js';
import { ensureShopOpen } from './shopService.js';

function normalizeCart(cartItems) {
  const grouped = new Map();

  for (const { itemId, quantity } of parse(cartSchema, cartItems)) {
    grouped.set(itemId, (grouped.get(itemId) || 0) + quantity);
  }

  // Todos os carrinhos bloqueiam os itens na mesma ordem, mesmo que dois
  // jogadores os tenham adicionado em ordens opostas.
  return [...grouped.entries()].map(([itemId, quantity]) => ({ itemId, quantity })).sort((a, b) => a.itemId - b.itemId);
}

async function resolveCheckoutCharacter(user, campaignId, characterId, prisma) {
  if (characterId) {
    const character = await findCharacterById(parse(characterIdSchema, characterId), campaignId, prisma);

    if (!character) {
      throw new ApiError(404, 'Personagem não encontrado.');
    }

    if (character.userId !== user.id) {
      throw new ApiError(403, 'Você não pode comprar com este personagem.');
    }

    return character;
  }

  return findCharacterByUserId(user.id, campaignId, prisma);
}

// `membership` e o papel do usuario na mesa da compra; so os itens dessa mesa
// podem entrar no carrinho.
export async function checkout(user, membership, cartItems, characterId, idempotencyKey) {
  const { campaignId } = membership;

  if (membership.role !== ROLES.PLAYER) {
    throw new ApiError(403, 'Apenas jogadores com personagem podem comprar itens.');
  }

  const normalizedCart = normalizeCart(cartItems);
  const key = parse(idempotencyKeySchema, idempotencyKey);
  const requestHash = createHash('sha256').update(JSON.stringify({
    characterId: characterId ? parse(characterIdSchema, characterId) : null,
    items: [...normalizedCart].sort((a, b) => a.itemId - b.itemId)
  })).digest('hex');
  const identity = { userId: user.id, campaignId, key };

  return withTransaction(async (prisma) => {
    // INSERT ON CONFLICT espera a transacao concorrente terminar. Se a compra
    // falhar, a reserva tambem volta atras e a mesma chave pode ser tentada.
    const reservation = await prisma.checkoutRequest.createMany({
      data: { ...identity, requestHash },
      skipDuplicates: true
    });
    if (reservation.count === 0) {
      const previous = await prisma.checkoutRequest.findUnique({ where: { userId_campaignId_key: identity } });
      if (previous.requestHash !== requestHash) {
        throw new ApiError(409, 'Esta chave de compra já foi usada com outro carrinho.');
      }
      return previous.response;
    }

    await ensureShopOpen(campaignId, prisma);
    const character = await resolveCheckoutCharacter(user, campaignId, characterId, prisma);

    if (!character) {
      throw new ApiError(400, 'Crie um personagem antes de comprar.');
    }

    const items = await findItemsByIds(
      normalizedCart.map((item) => item.itemId),
      campaignId,
      prisma
    );
    const itemMap = new Map(items.map((item) => [item.id, item]));

    let totalValue = 0;

    for (const cartItem of normalizedCart) {
      const item = itemMap.get(cartItem.itemId);

      if (!item || !item.isActive) {
        throw new ApiError(404, `Item ${cartItem.itemId} não encontrado.`);
      }

      if (item.stock < cartItem.quantity) {
        throw new ApiError(400, `Estoque insuficiente para ${item.name}.`);
      }

      totalValue += item.price * cartItem.quantity;
    }

    // Os valores lidos acima podem ter mudado por outra compra ou por um ajuste
    // do Mestre; os descontos so acontecem se ainda houver saldo na escrita.
    if (!(await debitCharacterGold(character.id, totalValue, prisma))) {
      throw new ApiError(400, 'Ouro insuficiente para concluir a compra.');
    }

    const purchase = await createPurchase(
      {
        characterId: character.id,
        totalValue
      },
      prisma
    );

    for (const cartItem of normalizedCart) {
      const item = itemMap.get(cartItem.itemId);

      if (!(await decrementItemStock(item.id, cartItem.quantity, prisma))) {
        throw new ApiError(400, `Estoque insuficiente para ${item.name}.`);
      }

      const { stock: newStock } = await prisma.item.findUnique({
        where: { id: item.id },
        select: { stock: true }
      });

      await createStockMovement(
        {
          itemId: item.id,
          actorUserId: user.id,
          previousStock: newStock + cartItem.quantity,
          newStock,
          reason: `Compra #${purchase.id}`
        },
        prisma
      );

      await addInventoryItem(character.id, item.id, cartItem.quantity, prisma);

      await addPurchaseItem(
        {
          purchaseId: purchase.id,
          itemId: item.id,
          quantity: cartItem.quantity,
          unitPrice: item.price
        },
        prisma
      );
    }

    const result = {
      message: 'Compra concluída com sucesso.',
      purchase: await findPurchaseById(purchase.id, prisma),
      character: await findCharacterById(character.id, campaignId, prisma)
    };
    await prisma.checkoutRequest.update({
      where: { userId_campaignId_key: identity },
      data: { response: JSON.parse(JSON.stringify(result)) }
    });
    return result;
  });
}
