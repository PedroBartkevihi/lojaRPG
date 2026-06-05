import { getPrisma } from './connection.js';

export function withTransaction(callback) {
  return getPrisma().$transaction((prisma) => callback(prisma));
}
