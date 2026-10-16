import { Router } from 'express';
import { z } from 'zod';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { id, integer, requiredText } from '../schemas/fields.js';
import { createDiscount, deleteDiscount, listDiscounts, setDiscountActive } from '../services/discountService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parse } from '../utils/validation.js';

const discountSchema = z
  .object({
    name: requiredText('Nome do desconto', 120),
    percent: integer('Desconto', { min: 1, max: 90 }),
    categoryId: id('Categoria').nullable().optional(),
    characterId: id('Personagem').nullable().optional()
  })
  .strict();

const activeSchema = z.object({ isActive: z.boolean({ error: 'Informe se o desconto está ativo.' }) }).strict();

// Descontos e eventos de preco: o Mestre cria, liga, desliga e remove; os
// jogadores veem os ativos que valem para eles.
export const discountRoutes = Router();

discountRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ discounts: await listDiscounts(req) });
}));

discountRoutes.post('/', requireGameMaster, asyncHandler(async (req, res) => {
  res.status(201).json({ discount: await createDiscount(req.campaign.id, parse(discountSchema, req.body)) });
}));

discountRoutes.patch('/:discountId', requireGameMaster, asyncHandler(async (req, res) => {
  const discountId = parse(id('Desconto'), req.params.discountId);
  const { isActive } = parse(activeSchema, req.body);
  res.json({ discount: await setDiscountActive(req.campaign.id, discountId, isActive) });
}));

discountRoutes.delete('/:discountId', requireGameMaster, asyncHandler(async (req, res) => {
  await deleteDiscount(req.campaign.id, parse(id('Desconto'), req.params.discountId));
  res.json({ message: 'Desconto removido.' });
}));
