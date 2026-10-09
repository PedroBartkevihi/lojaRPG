import { z } from 'zod';
import { id, integer, optionalText, requiredText } from './fields.js';

const quantity = integer('Quantidade', { min: 1, max: 1000 });

export const sellItemSchema = z.object({
  itemId: id('Id do item'),
  quantity
});

export const useItemSchema = z.object({
  itemId: id('Id do item'),
  quantity,
  reason: optionalText(240)
});

export const goldRewardSchema = z.object({
  characterIds: z
    .array(id('Id do personagem'), { error: 'Escolha pelo menos um personagem.' })
    .min(1, 'Escolha pelo menos um personagem.'),
  total: integer('Ouro da recompensa', { min: 1, max: 1000000 }),
  mode: z.enum(['split', 'each'], { error: 'Forma de distribuicao invalida.' }),
  reason: requiredText('Motivo da recompensa', 240)
});

export const itemRewardSchema = z.object({
  characterId: id('Id do personagem'),
  itemId: id('Id do item'),
  quantity,
  reason: optionalText(240)
});
