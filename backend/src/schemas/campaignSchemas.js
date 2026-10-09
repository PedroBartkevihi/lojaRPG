import { z } from 'zod';
import { INVITE_CODE_LENGTH, normalizeInviteCode } from '../utils/inviteCode.js';
import { id, requiredText } from './fields.js';

export const campaignSchema = z.object({
  name: requiredText('Nome da mesa', 120)
});

export const campaignIdSchema = id('Id da mesa');

export const memberIdSchema = id('Id do participante');

export const inviteCodeSchema = z.preprocess(
  normalizeInviteCode,
  z.string().length(INVITE_CODE_LENGTH, 'Codigo de convite invalido.')
);
