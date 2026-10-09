import { randomInt } from 'node:crypto';

// Sem 0, O, 1 e I, que se confundem quando o codigo e passado por mensagem.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const INVITE_CODE_LENGTH = 8;

export function createInviteCode() {
  let code = '';

  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }

  return code;
}

// Aceita o codigo digitado com hifen, espacos ou letras minusculas.
export function normalizeInviteCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}
