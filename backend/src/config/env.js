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
  trustProxy: Number.parseInt(process.env.TRUST_PROXY || '0', 10) || 0,
  // Quantas mesas uma conta pode mestrar ao mesmo tempo, para a loja nao virar
  // deposito de dados de terceiros. Excluir uma mesa libera a vaga.
  maxCampaignsPerUser: Number.parseInt(process.env.MAX_CAMPAIGNS_PER_USER || '10', 10) || 10,
  // Endereco do site, usado nos links dos e-mails. Sem ele, vale a primeira
  // origem do CORS (que e o site).
  appUrl: (process.env.APP_URL || '').replace(/\/$/, ''),
  // E-mail transacional (recuperar senha) pela API do Resend. Sem a chave, os
  // e-mails nao saem: em desenvolvimento o link aparece no log da API.
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
  // Refresh token em cookie httpOnly (quando o front pede). "lax" serve para
  // site e API no mesmo dominio (app. e api. de um dominio proprio); "none"
  // para dominios diferentes, que navegadores com bloqueio de cookies de
  // terceiros recusam. Veja o DEPLOY.md.
  refreshCookieSameSite: ['lax', 'strict', 'none'].includes(process.env.REFRESH_COOKIE_SAMESITE)
    ? process.env.REFRESH_COOKIE_SAMESITE
    : 'lax'
};

env.appUrl ||= env.corsOrigins[0] || 'http://localhost:5173';

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
