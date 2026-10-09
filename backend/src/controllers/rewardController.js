import { goldRewardSchema, itemRewardSchema } from '../schemas/inventorySchemas.js';
import { giveGold, giveItem } from '../services/rewardService.js';
import { parse } from '../utils/validation.js';

export async function gold(req, res) {
  const data = parse(goldRewardSchema, req.body);
  res.json(await giveGold({ ...data, actorUserId: req.user.id, campaignId: req.campaign.id }));
}

export async function items(req, res) {
  const data = parse(itemRewardSchema, req.body);
  res.json(await giveItem({ ...data, actorUserId: req.user.id, campaignId: req.campaign.id }));
}
