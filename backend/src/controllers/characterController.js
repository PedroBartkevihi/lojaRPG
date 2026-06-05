import { ROLES } from '../config/roles.js';
import {
  createCharacter,
  findCharacterById,
  findCharacterByUserId,
  findCharactersByUserId,
  listCharacters,
  setCharacterGold,
  updateCharacter
} from '../models/characterModel.js';
import { createGoldAuditLog, listGoldAuditLogs } from '../models/goldAuditModel.js';
import { findUserById } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import * as validate from '../utils/validation.js';

function parseCharacter(body, existing = {}) {
  const hasExisting = Boolean(existing.id);

  return {
    name:
      body.name === undefined && hasExisting
        ? existing.name
        : validate.requiredString(body.name, 'Nome do personagem', 120),
    className:
      body.className === undefined && body.class === undefined && hasExisting
        ? existing.className
        : validate.requiredString(body.className || body.class, 'Classe', 80),
    race:
      body.race === undefined && body.raca === undefined && hasExisting
        ? existing.race
        : validate.requiredString(body.race || body.raca, 'Raca', 80),
    level:
      body.level === undefined && hasExisting
        ? existing.level || 1
        : validate.integer(body.level, 'Nivel', { min: 1, max: 20 })
  };
}

function canAccessCharacter(user, character) {
  return user.role === ROLES.GAME_MASTER || character.userId === user.id;
}

export async function index(_req, res) {
  res.json({ characters: await listCharacters() });
}

export async function me(req, res) {
  const characters = await findCharactersByUserId(req.user.id);
  res.json({ character: characters[0] || null, characters });
}

export async function create(req, res) {
  const userId =
    req.user.role === ROLES.GAME_MASTER && req.body.userId
      ? validate.integer(req.body.userId, 'Usuario', { min: 1 })
      : req.user.id;

  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, 'Usuario nao encontrado.');
  }

  const data = parseCharacter(req.body);
  const gold =
    req.user.role === ROLES.GAME_MASTER
      ? validate.integer(req.body.gold || 0, 'Ouro', { min: 0, max: 1000000 })
      : 0;

  const character = await createCharacter({
    ...data,
    userId,
    gold
  });

  res.status(201).json({ character });
}

export async function update(req, res) {
  const id = validate.integer(req.params.id, 'Id do personagem', { min: 1 });
  const existing = await findCharacterById(id);

  if (!existing) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  if (!canAccessCharacter(req.user, existing)) {
    throw new ApiError(403, 'Voce nao pode editar este personagem.');
  }

  const character = await updateCharacter(id, parseCharacter(req.body, existing));
  res.json({ character });
}

export async function changeGold(req, res) {
  const id = validate.integer(req.params.id, 'Id do personagem', { min: 1 });
  const existing = await findCharacterById(id);

  if (!existing) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  const mode = req.body.mode === 'set' || req.body.gold !== undefined ? 'set' : 'adjust';
  const nextGold =
    mode === 'set'
      ? validate.integer(req.body.gold ?? req.body.amount, 'Ouro', { min: 0, max: 1000000 })
      : existing.gold + validate.integer(req.body.amount, 'Ajuste de ouro', { min: -1000000, max: 1000000 });

  if (nextGold < 0) {
    throw new ApiError(400, 'Ouro nao pode ficar negativo.');
  }

  const reason = validate.requiredString(req.body.reason, 'Motivo da alteracao de ouro', 240);
  const character = await setCharacterGold(id, nextGold);
  const auditLog = await createGoldAuditLog({
    actorUserId: req.user.id,
    characterId: existing.id,
    previousGold: existing.gold,
    newGold: nextGold,
    delta: nextGold - existing.gold,
    reason
  });

  res.json({ character, auditLog });
}

export async function goldAudit(req, res) {
  const characterId = req.query.characterId
    ? validate.integer(req.query.characterId, 'Id do personagem', { min: 1 })
    : undefined;

  res.json({ logs: await listGoldAuditLogs({ characterId }) });
}
