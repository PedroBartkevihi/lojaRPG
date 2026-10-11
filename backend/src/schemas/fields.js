import { z } from 'zod';

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

export const password = z
  .string({ error: 'Senha deve ter pelo menos 6 caracteres.' })
  .min(6, 'Senha deve ter pelo menos 6 caracteres.');
