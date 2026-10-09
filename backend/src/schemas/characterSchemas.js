import { z } from 'zod';
import { id, integer, requiredText } from './fields.js';

export const characterSchema = z.object({
  name: requiredText('Nome do personagem', 120),
  className: requiredText('Classe', 80),
  race: requiredText('Raça', 80),
  level: integer('Nível', { min: 1, max: 20 })
});

export const characterIdSchema = id('Id do personagem');

export const characterOwnerSchema = id('Usuário');

export const goldSchema = integer('Ouro', { min: 0, max: 1000000 });

export const goldAdjustmentSchema = integer('Ajuste de ouro', { min: -1000000, max: 1000000 });

export const goldReasonSchema = requiredText('Motivo da alteração de ouro', 240);
