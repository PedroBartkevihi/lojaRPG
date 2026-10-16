import { defineConfig, devices } from '@playwright/test';

// Os testes sobem a API e o site de verdade, com um banco proprio. O inicio da
// API aplica as migrations e recria a mesa de demonstracao, como no Render.
const API_PORT = 3101;
const WEB_PORT = 4173;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const databaseUrl = process.env.E2E_DATABASE_URL || 'postgresql://lojarpg:lojarpg@127.0.0.1:5432/lojarpg_e2e';
const CI = Boolean(process.env.CI);

// Os testes criam contas e mesas: a trava evita apontar para o banco de
// desenvolvimento ou de producao por engano.
if (!/_(e2e|review)$/.test(new URL(databaseUrl).pathname)) {
  throw new Error('E2E_DATABASE_URL precisa apontar para um banco cujo nome termina em _e2e ou _review.');
}

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
        TRUST_PROXY: '1'
      }
    },
    {
      name: 'Site',
      command: `npm run build && npx vite preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: '../frontend',
      url: WEB_URL,
      timeout: 180000,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: API_URL,
        VITE_DEMO_LOGIN: 'true'
      }
    }
  ]
});
