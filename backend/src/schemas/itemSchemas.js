import { z } from 'zod';
import { id, integer, optionalText, requiredText } from './fields.js';

export const itemSchema = z.object({
  name: requiredText('Nome do item', 140),
  category: requiredText('Categoria', 80),
  description: optionalText(1200),
  price: integer('Preco', { min: 0, max: 1000000 }),
  // Vazio (ou null) volta para a regra padrao: metade do preco.
  sellPrice: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    integer('Preco de venda', { min: 0, max: 1000000 }).nullable()
  ),
  isSellable: z.boolean({ error: 'Informe se a loja compra o item.' }).optional(),
  rarity: requiredText('Raridade', 80),
  stock: integer('Estoque', { min: 0, max: 100000 }),
  imageUrl: optionalText(1000)
});

export const itemIdSchema = id('Id do item');
