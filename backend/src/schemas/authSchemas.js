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

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string({ error: 'Link inválido ou vencido. Peça um novo na tela de entrada.' }),
  password: newPassword
});
