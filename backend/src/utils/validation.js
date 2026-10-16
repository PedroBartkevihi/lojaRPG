import { ApiError } from './ApiError.js';

/**
 * Valida com o schema e devolve o valor ja tipado (z.infer); um erro vira 400
 * com a primeira mensagem.
 * @template {import('zod').ZodType} S
 * @param {S} schema
 * @param {unknown} data
 * @returns {import('zod').infer<S>}
 */
export function parse(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiError(400, result.error.issues[0].message);
  }

  return result.data;
}

// Valida so os campos enviados numa edicao; os ausentes ficam de fora do
// resultado para o chamador manter os valores atuais.
/**
 * @template {import('zod').ZodObject} S
 * @param {S} objectSchema
 * @param {Record<string, unknown>} data
 * @returns {Partial<import('zod').infer<S>>}
 */
export function parseChanges(objectSchema, data) {
  const provided = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

  return /** @type {Partial<import('zod').infer<S>>} */ (parse(objectSchema.partial(), provided));
}
