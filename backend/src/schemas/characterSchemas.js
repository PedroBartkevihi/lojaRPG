import { z } from 'zod';
import { id, integer, requiredText } from './fields.js';

export const characterSchema = z.object({
  name: requiredText('Nome do personagem', 120),
  className: requiredText('Classe', 80),
  race: requiredText('Raça', 80),
  level: integer('Nível', { min: 1, max: 20 }),
  // Valor de Forca da ficha (1 a 30); sem ele, 10.
  strength: integer('Força', { min: 1, max: 30 }).optional()
});

export const characterIdSchema = id('Id do personagem');

export const characterOwnerSchema = id('Usuário');

export const goldSchema = integer('Ouro', { min: 0, max: 100000000 });

export const goldAdjustmentSchema = integer('Ajuste de ouro', { min: -100000000, max: 100000000 });

export const goldReasonSchema = requiredText('Motivo da alteração de ouro', 240);
