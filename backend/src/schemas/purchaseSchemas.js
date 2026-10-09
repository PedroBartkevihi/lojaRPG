import { z } from 'zod';

const INVALID_CART_ITEM = 'Itens do carrinho inválidos.';

const positiveInteger = z.coerce
  .number({ error: INVALID_CART_ITEM })
  .int(INVALID_CART_ITEM)
  .positive(INVALID_CART_ITEM);

// Aceita itemId ou item_id, como o front-end antigo enviava.
const cartItemSchema = z.preprocess(
  (value) =>
    value && typeof value === 'object' ? { itemId: value.itemId ?? value.item_id, quantity: value.quantity } : value,
  z.object({ itemId: positiveInteger, quantity: positiveInteger }, { error: INVALID_CART_ITEM })
);

export const cartSchema = z.array(cartItemSchema, { error: 'Carrinho vazio.' }).min(1, 'Carrinho vazio.');
