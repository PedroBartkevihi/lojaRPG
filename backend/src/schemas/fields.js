import { z } from 'zod';
import { isCommonPassword } from '../utils/commonPasswords.js';

export function requiredText(field, maxLength = 255) {
  const required = `${field} é obrigatório.`;

  return z
    .string({ error: required })
    .trim()
    .min(1, required)
    .max(maxLength, `${field} deve ter no máximo ${maxLength} caracteres.`);
}

export function optionalText(maxLength = 1000) {
  return z.preprocess(
    (value) => (value === undefined || value === null ? '' : String(value)),
    z.string().trim().max(maxLength, `Texto deve ter no máximo ${maxLength} caracteres.`)
  );
}

export function integer(field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const message = `${field} deve ser um número inteiro entre ${min} e ${max}.`;

  return z.coerce.number({ error: message }).int(message).min(min, message).max(max, message);
}

// Os ids sao `integer` do PostgreSQL (32 bits): um numero maior passaria pela
// validacao e quebraria a consulta com erro 500.
const MAX_DATABASE_ID = 2147483647;

export function id(field) {
  return integer(field, { min: 1, max: MAX_DATABASE_ID });
}

export const email = requiredText('Email', 255).toLowerCase().pipe(z.email('Email inválido.'));

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_LENGTH_MESSAGE = `Senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;

// Senha nova (cadastro e troca): pelo menos 8 caracteres e fora da lista de
// senhas comuns. O limite de 128 evita gastar o scrypt com textos enormes.
export const newPassword = z
  .string({ error: PASSWORD_LENGTH_MESSAGE })
  .min(PASSWORD_MIN_LENGTH, PASSWORD_LENGTH_MESSAGE)
  .max(128, 'Senha deve ter no máximo 128 caracteres.')
  // Espacos nas pontas nao contam: "        " ou "1234567 " nao passam.
  .refine((value) => value.trim().length >= PASSWORD_MIN_LENGTH, PASSWORD_LENGTH_MESSAGE)
  .refine((value) => !isCommonPassword(value), 'Essa senha é muito comum. Escolha outra, mais difícil de adivinhar.');

// No login a regra nova nao vale: contas criadas com o minimo antigo (6
// caracteres) continuam entrando ate trocar a senha. O cadastro antigo nao
// tinha maximo, entao o teto aqui e so contra abuso, bem acima dos 128.
export const loginPassword = z
  .string({ error: 'Senha é obrigatória.' })
  .min(1, 'Senha é obrigatória.')
  .max(1024, 'Email ou senha inválidos.');
