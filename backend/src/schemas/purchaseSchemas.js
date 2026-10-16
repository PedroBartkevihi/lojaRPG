import { z } from 'zod';

export const idempotencyKeySchema = z.uuid('Envie uma chave de compra válida (idempotencyKey).');

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

// Total que o jogador viu no carrinho, em PC. Se os precos mudarem antes da
// compra (desconto desligado, outro personagem), a API recusa em vez de
// cobrar outro valor.
export const expectedTotalSchema = z.coerce
  .number({ error: 'Total esperado inválido.' })
  .int('Total esperado inválido.')
  .min(0, 'Total esperado inválido.')
  .optional();
