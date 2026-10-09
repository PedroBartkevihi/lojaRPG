import { findMembership } from '../models/campaignModel.js';
import { campaignIdSchema } from '../schemas/campaignSchemas.js';
import { ApiError } from '../utils/ApiError.js';
import { parse } from '../utils/validation.js';

// Carrega a mesa da URL e o papel de quem pede. Quem nao participa recebe 404,
// como se a mesa nao existisse, para nao revelar quais ids estao em uso.
export async function loadCampaign(req, _res, next) {
  const campaignId = parse(campaignIdSchema, req.params.campaignId);
  const membership = await findMembership(campaignId, req.user.id);

  if (!membership) {
    throw new ApiError(404, 'Mesa não encontrada.');
  }

  req.campaign = membership.campaign;
  req.membership = membership;
  next();
}
