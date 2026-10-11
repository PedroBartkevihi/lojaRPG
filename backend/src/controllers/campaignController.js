import { isDemoAccount } from '../config/demo.js';
import { listCampaignsByUserId, listMembers, mapCampaign } from '../models/campaignModel.js';
import { getPrisma } from '../database/connection.js';
import { campaignSchema, inviteCodeSchema, memberIdSchema, shopStateSchema } from '../schemas/campaignSchemas.js';
import {
  createCampaign,
  deleteCampaign,
  joinCampaign,
  regenerateInviteCode,
  removeMember
} from '../services/campaignService.js';
import { parse } from '../utils/validation.js';

export async function index(req, res) {
  const campaigns = await listCampaignsByUserId(req.user.id);
  res.json({ campaigns: isDemoAccount(req.user) ? campaigns.filter((campaign) => campaign.isDemo) : campaigns });
}

export async function create(req, res) {
  const { name } = parse(campaignSchema, req.body);
  res.status(201).json({ campaign: await createCampaign(req.user, { name }) });
}

export async function join(req, res) {
  const result = await joinCampaign(req.user, parse(inviteCodeSchema, req.body.inviteCode));
  const message = result.joined
    ? `Você entrou na mesa "${result.campaign.name}".`
    : `Você já participa da mesa "${result.campaign.name}".`;

  res.status(result.joined ? 201 : 200).json({ message, campaign: result.campaign });
}

export async function show(req, res) {
  res.json({
    campaign: req.campaign,
    members: await listMembers(req.campaign.id)
  });
}

export async function setShopState(req, res) {
  const data = parse(shopStateSchema, req.body);
  const campaign = await getPrisma().campaign.update({ where: { id: req.campaign.id }, data });
  res.json({ campaign: mapCampaign(campaign, req.membership.role) });
}

export async function remove(req, res) {
  await deleteCampaign(req.campaign.id);
  res.json({ message: `Mesa "${req.campaign.name}" excluída.` });
}

export async function newInviteCode(req, res) {
  res.json({ campaign: await regenerateInviteCode(req.campaign.id, req.user.id) });
}

export async function removeMemberAction(req, res) {
  const userId = parse(memberIdSchema, req.params.userId);
  await removeMember(req.membership, userId);

  res.json({
    message: userId === req.user.id ? `Você saiu da mesa "${req.campaign.name}".` : 'Jogador removido da mesa.'
  });
}
