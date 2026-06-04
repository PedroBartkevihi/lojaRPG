import { ROLES } from '../config/roles.js';
import {
  createCharacter,
  findCharacterById,
  findCharacterByUserId,
  listCharacters,
  setCharacterGold,
  updateCharacter
} from '../models/characterModel.js';
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

export function index(_req, res) {
  res.json({ characters: listCharacters() });
}

export function me(req, res) {
  res.json({ character: findCharacterByUserId(req.user.id) });
}

export function create(req, res) {
  const userId =
    req.user.role === ROLES.GAME_MASTER && req.body.userId
      ? validate.integer(req.body.userId, 'Usuario', { min: 1 })
      : req.user.id;

  const user = findUserById(userId);

  if (!user) {
    throw new ApiError(404, 'Usuario nao encontrado.');
  }

  if (findCharacterByUserId(userId)) {
    throw new ApiError(409, 'Este usuario ja possui personagem.');
  }

  const data = parseCharacter(req.body);
  const gold =
    req.user.role === ROLES.GAME_MASTER
      ? validate.integer(req.body.gold || 0, 'Ouro', { min: 0, max: 1000000 })
      : 0;

  const character = createCharacter({
    ...data,
    userId,
    gold
  });

  res.status(201).json({ character });
}

export function update(req, res) {
  const id = validate.integer(req.params.id, 'Id do personagem', { min: 1 });
  const existing = findCharacterById(id);

  if (!existing) {
    throw new ApiError(404, 'Personagem nao encontrado.');
  }

  if (!canAccessCharacter(req.user, existing)) {
    throw new ApiError(403, 'Voce nao pode editar este personagem.');
  }

  const character = updateCharacter(id, parseCharacter(req.body, existing));
  res.json({ character });
}

export function changeGold(req, res) {
  const id = validate.integer(req.params.id, 'Id do personagem', { min: 1 });
  const existing = findCharacterById(id);

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

  const character = setCharacterGold(id, nextGold);
  res.json({ character });
}
