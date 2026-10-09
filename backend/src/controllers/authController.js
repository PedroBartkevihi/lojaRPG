import { loginSchema, registerSchema } from '../schemas/authSchemas.js';
import { loginUser, logoutSession, refreshSession, registerUser } from '../services/authService.js';
import { parse } from '../utils/validation.js';

export async function register(req, res) {
  const { name, email, password } = parse(registerSchema, req.body);
  res.status(201).json(await registerUser({ name, email, password }));
}

export async function login(req, res) {
  const { email, password } = parse(loginSchema, req.body);
  res.json(await loginUser(email, password));
}

export async function refresh(req, res) {
  res.json(await refreshSession(req.body.refreshToken));
}

export async function logout(req, res) {
  await logoutSession(req.body.refreshToken);
  res.json({ message: 'Logout realizado.' });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
