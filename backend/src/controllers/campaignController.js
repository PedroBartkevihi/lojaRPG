import { listCampaignsByUserId, listMembers } from '../models/campaignModel.js';
import { campaignSchema, inviteCodeSchema, memberIdSchema } from '../schemas/campaignSchemas.js';
import {
  createCampaign,
  deleteCampaign,
  joinCampaign,
  regenerateInviteCode,
  removeMember
} from '../services/campaignService.js';
import { parse } from '../utils/validation.js';

export async function index(req, res) {
  res.json({ campaigns: await listCampaignsByUserId(req.user.id) });
}

export async function create(req, res) {
  const { name } = parse(campaignSchema, req.body);
  res.status(201).json({ campaign: await createCampaign(req.user, { name }) });
}

export async function join(req, res) {
  const result = await joinCampaign(req.user, parse(inviteCodeSchema, req.body.inviteCode));
  const message = result.joined
    ? `Voce entrou na mesa "${result.campaign.name}".`
    : `Voce ja participa da mesa "${result.campaign.name}".`;

  res.status(result.joined ? 201 : 200).json({ message, campaign: result.campaign });
}

export async function show(req, res) {
  res.json({
    campaign: req.campaign,
    members: await listMembers(req.campaign.id)
  });
}

export async function remove(req, res) {
  await deleteCampaign(req.campaign.id);
  res.json({ message: `Mesa "${req.campaign.name}" excluida.` });
}

export async function newInviteCode(req, res) {
  res.json({ campaign: await regenerateInviteCode(req.campaign.id, req.user.id) });
}

export async function removeMemberAction(req, res) {
  const userId = parse(memberIdSchema, req.params.userId);
  await removeMember(req.membership, userId);

  res.json({
    message: userId === req.user.id ? `Voce saiu da mesa "${req.campaign.name}".` : 'Jogador removido da mesa.'
  });
}
