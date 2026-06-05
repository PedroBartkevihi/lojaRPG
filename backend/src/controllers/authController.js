import { ROLES } from '../config/roles.js';
import { findCharacterByUserId, findCharactersByUserId } from '../models/characterModel.js';
import { loginUser, logoutSession, refreshSession, registerUser } from '../services/authService.js';
import * as validate from '../utils/validation.js';

function parseCharacter(body) {
  const source = body.character || {};

  if (!source.name && !body.characterName) {
    return null;
  }

  return {
    name: validate.requiredString(source.name || body.characterName, 'Nome do personagem', 120),
    className: validate.requiredString(source.className || source.class || body.className, 'Classe', 80),
    race: validate.requiredString(source.race || source.raca || body.race, 'Raca', 80),
    level: validate.integer(source.level || body.level || 1, 'Nivel', { min: 1, max: 20 })
  };
}

export async function register(req, res) {
  const role = validate.role(req.body.role);
  const character = role === ROLES.PLAYER ? parseCharacter(req.body) : null;

  const result = await registerUser({
    name: validate.requiredString(req.body.name, 'Nome', 120),
    email: validate.email(req.body.email),
    password: validate.password(req.body.password),
    role,
    masterKey: req.body.masterKey || req.get('x-master-key'),
    character
  });

  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await loginUser(validate.email(req.body.email), validate.password(req.body.password));
  const character = await findCharacterByUserId(result.user.id);
  const characters = await findCharactersByUserId(result.user.id);

  res.json({
    ...result,
    character,
    characters
  });
}

export async function refresh(req, res) {
  const result = await refreshSession(req.body.refreshToken);
  const character = await findCharacterByUserId(result.user.id);
  const characters = await findCharactersByUserId(result.user.id);

  res.json({
    ...result,
    character,
    characters
  });
}

export async function logout(req, res) {
  await logoutSession(req.body.refreshToken);
  res.json({ message: 'Logout realizado.' });
}

export async function me(req, res) {
  const character = await findCharacterByUserId(req.user.id);
  const characters = await findCharactersByUserId(req.user.id);
  res.json({
    user: req.user,
    character,
    characters
  });
}
