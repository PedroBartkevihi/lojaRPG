import { ROLES } from '../config/roles.js';
import { findCharacterByUserId, findCharactersByUserId } from '../models/characterModel.js';
import { loginSchema, registerSchema, roleSchema } from '../schemas/authSchemas.js';
import { characterSchema } from '../schemas/characterSchemas.js';
import { loginUser, logoutSession, refreshSession, registerUser } from '../services/authService.js';
import { parse } from '../utils/validation.js';

// O cadastro aceita o personagem aninhado em `character` ou em campos soltos.
function parseCharacter(body) {
  const source = body.character || {};

  if (!source.name && !body.characterName) {
    return null;
  }

  return parse(characterSchema, {
    name: source.name || body.characterName,
    className: source.className || source.class || body.className,
    race: source.race || source.raca || body.race,
    level: source.level || body.level || 1
  });
}

export async function register(req, res) {
  const role = parse(roleSchema, req.body.role);
  const character = role === ROLES.PLAYER ? parseCharacter(req.body) : null;
  const { name, email, password } = parse(registerSchema, req.body);

  const result = await registerUser({
    name,
    email,
    password,
    role,
    masterKey: req.body.masterKey || req.get('x-master-key'),
    character
  });

  res.status(201).json(result);
}

export async function login(req, res) {
  const { email, password } = parse(loginSchema, req.body);
  const result = await loginUser(email, password);
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
