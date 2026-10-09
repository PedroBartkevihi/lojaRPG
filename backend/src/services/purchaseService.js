import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import { createStockMovement } from '../models/catalogModel.js';
import { debitCharacterGold, findCharacterById, findCharacterByUserId } from '../models/characterModel.js';
import { addInventoryItem } from '../models/inventoryModel.js';
import { decrementItemStock, findItemsByIds } from '../models/itemModel.js';
import { addPurchaseItem, createPurchase, findPurchaseById } from '../models/purchaseModel.js';
import { characterIdSchema } from '../schemas/characterSchemas.js';
import { cartSchema } from '../schemas/purchaseSchemas.js';
import { ApiError } from '../utils/ApiError.js';
import { parse } from '../utils/validation.js';

function normalizeCart(cartItems) {
  const grouped = new Map();

  for (const { itemId, quantity } of parse(cartSchema, cartItems)) {
    grouped.set(itemId, (grouped.get(itemId) || 0) + quantity);
  }

  return [...grouped.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
}

async function resolveCheckoutCharacter(user, characterId, prisma) {
  if (characterId) {
    const character = await findCharacterById(parse(characterIdSchema, characterId), prisma);

    if (!character) {
      throw new ApiError(404, 'Personagem nao encontrado.');
    }

    if (character.userId !== user.id) {
      throw new ApiError(403, 'Voce nao pode comprar com este personagem.');
    }

    return character;
  }

  return findCharacterByUserId(user.id, prisma);
}

export async function checkout(user, cartItems, characterId) {
  if (user.role !== ROLES.PLAYER) {
    throw new ApiError(403, 'Apenas jogadores com personagem podem comprar itens.');
  }

  const normalizedCart = normalizeCart(cartItems);

  return withTransaction(async (prisma) => {
    const character = await resolveCheckoutCharacter(user, characterId, prisma);

    if (!character) {
      throw new ApiError(400, 'Crie um personagem antes de comprar.');
    }

    const items = await findItemsByIds(
      normalizedCart.map((item) => item.itemId),
      prisma
    );
    const itemMap = new Map(items.map((item) => [item.id, item]));

    let totalValue = 0;

    for (const cartItem of normalizedCart) {
      const item = itemMap.get(cartItem.itemId);

      if (!item || !item.isActive) {
        throw new ApiError(404, `Item ${cartItem.itemId} nao encontrado.`);
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

    return {
      message: 'Compra concluida com sucesso.',
      purchase: await findPurchaseById(purchase.id, prisma),
      character: await findCharacterById(character.id, prisma)
    };
  });
}
