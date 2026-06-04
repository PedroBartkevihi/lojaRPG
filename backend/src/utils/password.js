import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, storedKey] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !storedKey) {
    return false;
  }

  const key = await scryptAsync(password, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(storedKey, 'base64url');

  if (storedBuffer.length !== key.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, key);
}
