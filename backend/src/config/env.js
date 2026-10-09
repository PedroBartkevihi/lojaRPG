import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(currentDir, '../..');

dotenv.config({ path: path.join(backendRoot, '.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresInDays: Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  masterRegistrationKey: process.env.MASTER_REGISTRATION_KEY || 'chave-dev-para-criar-mestre'
};

// Valores de exemplo que aparecem no repositorio (defaults, .env.*.example e
// docker-compose antigo). Quem le o codigo conhece todos eles.
const EXAMPLE_SECRETS = new Set([
  'dev-secret-change-me',
  'troque-este-segredo-em-producao',
  'configure-um-segredo-longo-e-unico',
  'chave-dev-para-criar-mestre',
  'troque-esta-chave',
  'configure-uma-chave-privada'
]);

function isWeakSecret(value, minLength) {
  return !value || EXAMPLE_SECRETS.has(value) || value.length < minLength;
}

export function assertProductionSecrets({ nodeEnv, jwtSecret, masterRegistrationKey }) {
  if (nodeEnv !== 'production') {
    return;
  }

  const problems = [];

  if (isWeakSecret(jwtSecret, 32)) {
    problems.push('JWT_SECRET precisa ter pelo menos 32 caracteres e nao pode ser um valor de exemplo');
  }

  if (isWeakSecret(masterRegistrationKey, 16)) {
    problems.push('MASTER_REGISTRATION_KEY precisa ter pelo menos 16 caracteres e nao pode ser um valor de exemplo');
  }

  if (problems.length > 0) {
    throw new Error(`Configuracao invalida para producao: ${problems.join('; ')}.`);
  }
}

assertProductionSecrets(env);
