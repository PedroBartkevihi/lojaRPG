import { z } from 'zod';

export const idempotencyKeySchema = z.uuid('Envie uma chave de compra válida (idempotencyKey).');

const INVALID_CART_ITEM = 'Itens do carrinho inválidos.';

const positiveInteger = z.coerce
  .number({ error: INVALID_CART_ITEM })
  .int(INVALID_CART_ITEM)
  .positive(INVALID_CART_ITEM);

// Aceita itemId ou item_id, como o front-end antigo enviava.
const cartItemSchema = z.preprocess(
  (value) => {
    const entry = /** @type {{ itemId?: unknown, item_id?: unknown, quantity?: unknown } | null} */ (value);
    return entry && typeof entry === 'object' ? { itemId: entry.itemId ?? entry.item_id, quantity: entry.quantity } : value;
  },
  z.object({ itemId: positiveInteger, quantity: positiveInteger }, { error: INVALID_CART_ITEM })
);

export const cartSchema = z.array(cartItemSchema, { error: 'Carrinho vazio.' }).min(1, 'Carrinho vazio.');
