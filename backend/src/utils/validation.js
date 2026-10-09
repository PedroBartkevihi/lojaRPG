import { ApiError } from './ApiError.js';

export function parse(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ApiError(400, result.error.issues[0].message);
  }

  return result.data;
}

// Valida so os campos enviados numa edicao; os ausentes ficam de fora do
// resultado para o chamador manter os valores atuais.
export function parseChanges(objectSchema, data) {
  const provided = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

  return parse(objectSchema.partial(), provided);
}
