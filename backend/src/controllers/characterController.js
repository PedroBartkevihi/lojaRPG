import { isGameMaster } from '../middlewares/roleMiddleware.js';
import { findMembership } from '../models/campaignModel.js';
import {
  createCharacter,
  findCharacterById,
  findCharactersByUserId,
  listCharacters,
  updateCharacter
} from '../models/characterModel.js';
import { listGoldAuditLogs } from '../models/goldAuditModel.js';
import {
  characterIdSchema,
  characterOwnerSchema,
  characterSchema,
  goldAdjustmentSchema,
  goldReasonSchema,
  goldSchema
} from '../schemas/characterSchemas.js';
import { changeCharacterGold } from '../services/goldService.js';
import { ApiError } from '../utils/ApiError.js';
import { parse, parseChanges } from '../utils/validation.js';

// Aceita os apelidos `class` e `raca`; um campo so conta como ausente quando
// nenhum dos dois nomes foi enviado.
function aliased(value, alias) {
  return value === undefined && alias === undefined ? undefined : value || alias || '';
}

function parseCharacter(body, existing) {
  const input = {
    name: body.name,
    className: aliased(body.className, body.class),
    race: aliased(body.race, body.raca),
    level: body.level
  };

  if (!existing) {
    return parse(characterSchema, input);
  }

  return {
    name: existing.name,
    className: existing.className,
    race: existing.race,
    level: existing.level || 1,
    ...parseChanges(characterSchema, input)
  };
}

function canAccessCharacter(req, character) {
  return isGameMaster(req) || character.userId === req.user.id;
}

export async function index(req, res) {
  res.json({ characters: await listCharacters(req.campaign.id) });
}

export async function me(req, res) {
  const characters = await findCharactersByUserId(req.user.id, req.campaign.id);
  res.json({ character: characters[0] || null, characters });
}

export async function create(req, res) {
  const userId =
    isGameMaster(req) && req.body.userId ? parse(characterOwnerSchema, req.body.userId) : req.user.id;

  if (!(await findMembership(req.campaign.id, userId))) {
    throw new ApiError(404, 'Participante nao encontrado.');
  }

  const data = parseCharacter(req.body);
  const gold = isGameMaster(req) ? parse(goldSchema, req.body.gold || 0) : 0;

  const character = await createCharacter({
    ...data,
    campaignId: req.campaign.id,
    userId,
    gold
  });

  res.status(201).json({ character });
}

export async function update(req, res) {
  const id = parse(characterIdSchema, req.params.id);
  const existing = await findCharacterById(id, req.campaign.id);

  if (!existing) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  if (!canAccessCharacter(req, existing)) {
    throw new ApiError(403, 'Voce nao pode editar este personagem.');
  }

  const character = await updateCharacter(id, parseCharacter(req.body, existing));
  res.json({ character });
}

export async function changeGold(req, res) {
  const id = parse(characterIdSchema, req.params.id);
  const mode = req.body.mode === 'set' || req.body.gold !== undefined ? 'set' : 'adjust';
  const value =
    mode === 'set'
      ? parse(goldSchema, req.body.gold ?? req.body.amount)
      : parse(goldAdjustmentSchema, req.body.amount);
  const reason = parse(goldReasonSchema, req.body.reason);

  res.json(
    await changeCharacterGold({
      campaignId: req.campaign.id,
      actorUserId: req.user.id,
      characterId: id,
      mode,
      value,
      reason
    })
  );
}

export async function goldAudit(req, res) {
  const characterId = req.query.characterId ? parse(characterIdSchema, req.query.characterId) : undefined;

  res.json({ logs: await listGoldAuditLogs({ campaignId: req.campaign.id, characterId }) });
}
