import { z } from 'zod';
import { id, integer, optionalText, requiredText } from './fields.js';

export const categorySchema = z.object({
  name: requiredText('Nome da categoria', 80),
  description: optionalText(500)
});

export const raritySchema = z.object({
  name: requiredText('Nome da raridade', 80),
  rank: integer('Rank da raridade', { min: 1, max: 100 }),
  description: optionalText(500)
});

export const categoryIdSchema = id('Id da categoria');

export const rarityIdSchema = id('Id da raridade');

export const stockItemIdSchema = id('Id do item');
