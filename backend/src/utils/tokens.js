import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken() {
  return randomBytes(48).toString('base64url');
}

/** @param {string} token */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** @param {number} days */
export function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
