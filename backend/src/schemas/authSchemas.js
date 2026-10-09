import { z } from 'zod';
import { email, password, requiredText } from './fields.js';

export const registerSchema = z.object({
  name: requiredText('Nome', 120),
  email,
  password
});

export const loginSchema = z.object({
  email,
  password
});
