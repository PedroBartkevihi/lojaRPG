import { z } from 'zod';
import { email, loginPassword, newPassword, requiredText } from './fields.js';

export const registerSchema = z.object({
  name: requiredText('Nome', 120),
  email,
  password: newPassword
});

export const loginSchema = z.object({
  email,
  password: loginPassword
});
