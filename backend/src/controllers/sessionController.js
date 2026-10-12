import { z } from 'zod';
import { getPrisma } from '../database/connection.js';
import { id, optionalText } from '../schemas/fields.js';
import { startSession, closeSession, sessionSummary } from '../services/sessionService.js';
import { historyPage, historyQuerySchema } from '../utils/historyPagination.js';
import { parse } from '../utils/validation.js';

const notesSchema = z.object({ notes: optionalText(3000) }).strict();
export async function index(req, res) {
  const page = await historyPage(getPrisma().campaignSession, { where: { campaignId: req.campaign.id }, timeField: 'startedAt' }, parse(historyQuerySchema, req.query));
  const active = await getPrisma().campaignSession.findFirst({ where: { campaignId: req.campaign.id, endedAt: null } });
  res.json({ sessions: page.entries, pagination: page.pagination, active });
}
export async function start(req, res) {
  const { notes } = parse(notesSchema, req.body);
  res.status(201).json({ session: await startSession(req.campaign.id, notes) });
}
export async function close(req, res) {
  const { notes } = parse(notesSchema, req.body);
  res.json({ session: await closeSession(req.campaign.id, parse(id('Sessão'), req.params.sessionId), req.body.notes === undefined ? undefined : notes) });
}
export async function summary(req, res) {
  res.json(await sessionSummary(req.campaign.id, parse(id('Sessão'), req.params.sessionId)));
}
