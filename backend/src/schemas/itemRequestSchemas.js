import { z } from 'zod';
import { id, integer, optionalText, requiredText } from './fields.js';

/** @param {string} field */
const money = (field) => integer(field, { min: 0, max: 100000000 });

export const itemRequestSchema = z
  .object({
    characterId: id('Personagem'),
    description: requiredText('Descrição da encomenda', 500),
    maxPrice: money('Valor máximo')
  })
  .strict();

export const itemRequestIdSchema = id('Encomenda');

// Aprovar com um item do catalogo (itemId) ou com um item novo, feito para a
// encomenda (newItem). O preco nao passa do maximo do jogador (o servico
// confere com o valor gravado).
export const approveItemRequestSchema = z
  .object({
    price: money('Preço'),
    itemId: id('Item').optional(),
    newItem: z
      .object({
        name: requiredText('Nome do item', 140),
        category: requiredText('Categoria', 80),
        rarity: requiredText('Raridade', 80),
        description: optionalText(1200)
      })
      .strict()
      .optional(),
    note: optionalText(300)
  })
  .strict()
  .refine((data) => Boolean(data.itemId) !== Boolean(data.newItem), {
    message: 'Escolha um item do catálogo ou descreva um item novo.'
  });

export const rejectItemRequestSchema = z.object({ note: optionalText(300) }).strict();
