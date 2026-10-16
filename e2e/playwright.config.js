import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { databaseUrl } from './database.js';

// Os testes sobem a API e o site de verdade, com um banco proprio. O inicio da
// API aplica as migrations e recria a mesa de demonstracao, como no Render.
const API_PORT = 3101;
const WEB_PORT = 4173;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const CI = Boolean(process.env.CI);
// E-mails da API (recuperar senha) vao para este arquivo; os testes leem o link.
export const MAIL_OUTBOX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'test-results', 'emails.jsonl');

// O arquivo nao e apagado entre execucoes: cada teste procura o e-mail da
// propria conta, que tem endereco unico.
mkdirSync(path.dirname(MAIL_OUTBOX), { recursive: true });

export default defineConfig({
  testDir: './tests',
  // Um fluxo por vez: varios testes usam a mesma mesa de demonstracao.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // O video precisa do ffmpeg do Playwright, instalado no CI junto com o Chromium.
    video: CI ? 'retain-on-failure' : 'off'
  },
  projects: [
    {
      name: 'chromium',
      // Sem os navegadores do Playwright instalados, E2E_BROWSER_CHANNEL=chrome
      // usa o Chrome do computador.
      use: { ...devices['Desktop Chrome'], channel: process.env.E2E_BROWSER_CHANNEL || undefined }
    }
  ],
  webServer: [
    {
      name: 'API',
      command: 'npx prisma migrate deploy && node prisma/seed.js && node src/server.js',
      cwd: '../backend',
      url: `${API_URL}/ready`,
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        DATABASE_URL: databaseUrl,
        JWT_SECRET: 'segredo-dos-testes-de-ponta-a-ponta',
        JWT_EXPIRES_IN: '15m',
        CORS_ORIGIN: WEB_URL,
        // Cada teste manda um X-Forwarded-For proprio (veja fixtures.js), para
        // os cadastros e logins nao dividirem o mesmo limite de tentativas.
        TRUST_PROXY: '1',
        MAIL_OUTBOX_FILE: MAIL_OUTBOX
      }
    },
    {
      // Build de producao servido com os cabecalhos do render.yaml (CSP
      // inclusive); veja static-server.js.
      name: 'Site',
      command: 'npm --prefix ../frontend run build && node static-server.js',
      url: WEB_URL,
      timeout: 180000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: API_URL,
        VITE_DEMO_LOGIN: 'true',
        // E2E_REFRESH_COOKIE=true testa o modo do refresh token em cookie
        // httpOnly (site e API no mesmo host, como com um dominio proprio).
        VITE_REFRESH_COOKIE: process.env.E2E_REFRESH_COOKIE === 'true' ? 'true' : 'false',
        E2E_API_URL: API_URL,
        PORT: String(WEB_PORT)
      }
    }
  ]
});
