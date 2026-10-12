import { z } from 'zod';
import { ApiError } from './ApiError.js';

export const historyQuerySchema = z.object({
  sessionId: z.union([z.literal('none'), z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(2147483647))]).optional(),
  limit: z.string().regex(/^\d+$/, 'Limite inválido.').default('25')
    .transform(Number).pipe(z.number().int().min(1).max(100)),
  cursor: z.string().max(200).regex(/^[A-Za-z0-9_-]+$/, 'Cursor inválido.').optional()
});
const cursorSchema = z.object({ at: z.iso.datetime(), id: z.number().int().min(1).max(2147483647) });

export function sessionWhere(sessionId) {
  return sessionId === undefined ? {} : { sessionId: sessionId === 'none' ? null : sessionId };
}

// O cursor guarda data + id, entao continua valido se a linha for excluida.
// O filtro de mesa/personagem sempre vem do chamador autenticado.
export async function historyPage(model, query, { limit = 25, cursor } = {}, mapEntry = (entry) => entry) {
  const { timeField = 'createdAt', ...options } = query;
  let before;
  if (cursor) {
    try {
      const decoded = cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
      before = { OR: [
        { [timeField]: { lt: new Date(decoded.at) } },
        { [timeField]: new Date(decoded.at), id: { lt: decoded.id } }
      ] };
    } catch (_error) {
      throw new ApiError(400, 'Cursor inválido. Atualize o histórico.');
    }
  }
  const rows = await model.findMany({
    ...options,
    where: before ? { AND: [options.where, before] } : options.where,
    orderBy: [{ [timeField]: 'desc' }, { id: 'desc' }],
    take: limit + 1
  });
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const hasMore = rows.length > limit;
  return {
    entries: page.map(mapEntry),
    pagination: {
      limit,
      hasMore,
      nextCursor: hasMore ? Buffer.from(JSON.stringify({ at: last[timeField].toISOString(), id: last.id })).toString('base64url') : null
    }
  };
}
