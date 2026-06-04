import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import { findCharacterByUserId, setCharacterGold } from '../models/characterModel.js';
import { addInventoryItem } from '../models/inventoryModel.js';
import { findItemsByIds } from '../models/itemModel.js';
import { addPurchaseItem, createPurchase, findPurchaseById } from '../models/purchaseModel.js';
import { ApiError } from '../utils/ApiError.js';

function normalizeCart(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ApiError(400, 'Carrinho vazio.');
  }

  const grouped = new Map();

  for (const cartItem of cartItems) {
    const itemId = Number(cartItem.itemId ?? cartItem.item_id);
    const quantity = Number(cartItem.quantity);

    if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError(400, 'Itens do carrinho invalidos.');
    }

    grouped.set(itemId, (grouped.get(itemId) || 0) + quantity);
  }

  return [...grouped.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
}

export function checkout(user, cartItems) {
  if (user.role !== ROLES.PLAYER) {
    throw new ApiError(403, 'Apenas jogadores com personagem podem comprar itens.');
  }

  const normalizedCart = normalizeCart(cartItems);

  return withTransaction((db) => {
    const character = findCharacterByUserId(user.id, db);

    if (!character) {
      throw new ApiError(400, 'Crie um personagem antes de comprar.');
    }

    const items = findItemsByIds(
      normalizedCart.map((item) => item.itemId),
      db
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

    if (character.gold < totalValue) {
      throw new ApiError(400, 'Ouro insuficiente para concluir a compra.');
    }

    setCharacterGold(character.id, character.gold - totalValue, db);

    const purchase = createPurchase(
      {
        characterId: character.id,
        totalValue
      },
      db
    );

    for (const cartItem of normalizedCart) {
      const item = itemMap.get(cartItem.itemId);

      db.prepare('UPDATE items SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        cartItem.quantity,
        item.id
      );

      addInventoryItem(character.id, item.id, cartItem.quantity, db);

      addPurchaseItem(
        {
          purchaseId: purchase.id,
          itemId: item.id,
          quantity: cartItem.quantity,
          unitPrice: item.price
        },
        db
      );
    }

    return {
      message: 'Compra concluida com sucesso.',
      purchase: findPurchaseById(purchase.id, db),
      character: findCharacterByUserId(user.id, db)
    };
  });
}
