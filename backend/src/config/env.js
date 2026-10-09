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
  // Quantos proxies ficam entre o usuario e a API. Atras de um proxy, sem esse
  // numero, a API ve o IP do proxy e todos os usuarios dividem o mesmo rate
  // limit; um numero maior que o real deixa o cliente forjar o proprio IP.
  trustProxy: Number.parseInt(process.env.TRUST_PROXY || '0', 10) || 0
};

// Valores de exemplo que aparecem no repositorio (defaults, .env.*.example e
// docker-compose antigo). Quem le o codigo conhece todos eles.
const EXAMPLE_SECRETS = new Set([
  'dev-secret-change-me',
  'troque-este-segredo-em-producao',
  'configure-um-segredo-longo-e-unico'
]);

function isWeakSecret(value, minLength) {
  return !value || EXAMPLE_SECRETS.has(value) || value.length < minLength;
}

export function assertProductionSecrets({ nodeEnv, jwtSecret }) {
  if (nodeEnv !== 'production') {
    return;
  }

  if (isWeakSecret(jwtSecret, 32)) {
    throw new Error(
      'Configuração inválida para produção: JWT_SECRET precisa ter pelo menos 32 caracteres e não pode ser um valor de exemplo.'
    );
  }
}

assertProductionSecrets(env);
