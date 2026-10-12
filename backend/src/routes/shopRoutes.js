import { Router } from 'express';
import { z } from 'zod';
import { getPrisma } from '../database/connection.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { id, requiredText, optionalText } from '../schemas/fields.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parse } from '../utils/validation.js';

const schema = z.object({ name: requiredText('Nome do vendedor', 80), hours: optionalText(300), isOpen: z.boolean().optional() }).strict();
export const shopRoutes = Router();
shopRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ shops: await getPrisma().shop.findMany({ where: { campaignId: req.campaign.id }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }) });
}));
shopRoutes.post('/', requireGameMaster, asyncHandler(async (req, res) => {
  const data = parse(schema, req.body);
  res.status(201).json({ shop: await getPrisma().shop.create({ data: { ...data, campaignId: req.campaign.id } }) });
}));
shopRoutes.patch('/:shopId', requireGameMaster, asyncHandler(async (req, res) => {
  const shopId = parse(id('Vendedor'), req.params.shopId);
  const data = parse(schema.partial().refine((value) => Object.keys(value).length > 0, 'Informe uma alteração.'), req.body);
  const shop = await getPrisma().shop.findFirst({ where: { id: shopId, campaignId: req.campaign.id } });
  if (!shop) throw new ApiError(404, 'Vendedor não encontrado.');
  res.json({ shop: await getPrisma().shop.update({ where: { id: shopId }, data }) });
}));
