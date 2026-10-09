import { z } from 'zod';
import { email, password, requiredText, role } from './fields.js';

export const roleSchema = role;

export const registerSchema = z.object({
  name: requiredText('Nome', 120),
  email,
  password
});

export const loginSchema = z.object({
  email,
  password
});
