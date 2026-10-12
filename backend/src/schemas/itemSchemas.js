import { z } from 'zod';
import { id, integer, optionalText, requiredText } from './fields.js';

export const itemSchema = z.object({
  shopId: id('Vendedor').optional(),
  name: requiredText('Nome do item', 140),
  category: requiredText('Categoria', 80),
  description: optionalText(1200),
  price: integer('Preço', { min: 0, max: 100000000 }),
  // Vazio (ou null) volta para a regra padrao: metade do preco.
  sellPrice: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    integer('Preço de venda', { min: 0, max: 100000000 }).nullable()
  ),
  isSellable: z.boolean({ error: 'Informe se a loja compra o item.' }).optional(),
  rarity: requiredText('Raridade', 80),
  stock: integer('Estoque', { min: 0, max: 100000 }),
  imageUrl: optionalText(1000)
});

export const itemIdSchema = id('Id do item');

// Estoque que o Mestre viu ao abrir a edicao (veja saveItemChanges).
export const expectedStockSchema = integer('Estoque esperado', { min: 0, max: 100000 });

// Filtros da lista, vindos da URL. Um parametro repetido chega como lista (e
// quebrava o .trim), e um preco com letras virava NaN na consulta: os dois
// eram erro 500.
const queryText = z.string({ error: 'Filtro inválido.' }).trim().max(120, 'Filtro muito longo.').optional();
const queryPrice = (field) => integer(field, { min: 0, max: 100000000 }).optional();

export const itemQuerySchema = z
  .object({
    shopId: id('Vendedor').optional(),
    search: queryText,
    category: queryText,
    rarity: queryText,
    status: queryText,
    minPrice: queryPrice('Preço mínimo'),
    maxPrice: queryPrice('Preço máximo')
  })
  .refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
    message: 'O preço mínimo não pode ser maior que o máximo.'
  });
