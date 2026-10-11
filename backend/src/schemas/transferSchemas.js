import { z } from 'zod';
import { id, integer, optionalText } from './fields.js';

export const transferSchema = z.object({
  targetCharacterId: id('Personagem de destino'),
  itemId: id('Item').optional(),
  quantity: integer('Quantidade', { min: 1, max: 100000 }).optional(),
  gold: integer('Ouro', { min: 0, max: 1000000 }).default(0),
  reason: optionalText(300),
  idempotencyKey: z.uuid()
}).strict().refine((data) => data.itemId ? data.quantity !== undefined : data.quantity === undefined, {
  message: 'Informe item e quantidade juntos.'
}).refine((data) => data.itemId || data.gold > 0, { message: 'Informe um item ou uma quantia positiva.' });
