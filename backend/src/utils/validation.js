import { ROLES } from '../config/roles.js';
import { ApiError } from './ApiError.js';

export function requiredString(value, field, maxLength = 255) {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!text) {
    throw new ApiError(400, `${field} e obrigatorio.`);
  }

  if (text.length > maxLength) {
    throw new ApiError(400, `${field} deve ter no maximo ${maxLength} caracteres.`);
  }

  return text;
}

export function optionalString(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  const text = String(value).trim();

  if (text.length > maxLength) {
    throw new ApiError(400, `Texto deve ter no maximo ${maxLength} caracteres.`);
  }

  return text;
}

export function email(value) {
  const text = requiredString(value, 'Email', 255).toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

  if (!valid) {
    throw new ApiError(400, 'Email invalido.');
  }

  return text;
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 6) {
    throw new ApiError(400, 'Senha deve ter pelo menos 6 caracteres.');
  }

  return value;
}

export function integer(value, field, options = {}) {
  const min = options.min ?? 0;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, `${field} deve ser um numero inteiro entre ${min} e ${max}.`);
  }

  return parsed;
}

export function role(value) {
  if (!value) {
    return ROLES.PLAYER;
  }

  const normalized = String(value).trim().toUpperCase();

  if (![ROLES.GAME_MASTER, ROLES.PLAYER].includes(normalized)) {
    throw new ApiError(400, 'Tipo de usuario invalido.');
  }

  return normalized;
}
