import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken() {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
