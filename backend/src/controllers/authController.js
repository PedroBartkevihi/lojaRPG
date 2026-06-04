import { ROLES } from '../config/roles.js';
import { findCharacterByUserId } from '../models/characterModel.js';
import { loginUser, registerUser } from '../services/authService.js';
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
  const character = findCharacterByUserId(result.user.id);

  res.json({
    ...result,
    character
  });
}

export function logout(_req, res) {
  res.json({ message: 'Logout realizado. Remova o token no cliente.' });
}

export function me(req, res) {
  const character = findCharacterByUserId(req.user.id);
  res.json({
    user: req.user,
    character
  });
}
