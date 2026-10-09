import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(currentDir, '../..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const rawDbFile = process.env.DB_FILE || 'data/loja-rpg.sqlite';
const resolvedDatabaseFile = path.isAbsolute(rawDbFile) ? rawDbFile : path.resolve(backendRoot, rawDbFile);
const defaultDatabaseUrl = path.isAbsolute(rawDbFile)
  ? `file:${resolvedDatabaseFile.replace(/\\/g, '/')}`
  : `file:../${rawDbFile.replace(/\\/g, '/')}`;

process.env.DATABASE_URL = process.env.DATABASE_URL || defaultDatabaseUrl;

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
  databaseUrl: process.env.DATABASE_URL,
  masterRegistrationKey: process.env.MASTER_REGISTRATION_KEY || 'chave-dev-para-criar-mestre'
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-secret-change-me') {
  throw new Error('Configure JWT_SECRET antes de iniciar em producao.');
}
