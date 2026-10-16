import { test as base, expect } from '@playwright/test';

let sequence = 0;

// Guarda os bloqueios da Content-Security-Policy que o Chrome anuncia no
// console ("Refused to load ... violates the following Content Security
// Policy directive").
export function watchCsp(page, violations) {
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
}

export const test = base.extend({
  // Cada teste sai de um IP proprio (a API confia em um proxy nos testes),
  // para os cadastros e logins de um fluxo nao gastarem o limite dos outros.
  extraHTTPHeaders: async ({}, use, testInfo) => {
    sequence += 1;
    await use({ 'X-Forwarded-For': `198.51.100.${((testInfo.retry * 97 + sequence) % 250) + 1}` });
  },
  // O site e servido com a CSP do render.yaml: qualquer bloqueio reprova o
  // teste, inclusive nas paginas abertas em outro contexto (cspViolations).
  cspViolations: [
    async ({ page }, use) => {
      const violations = [];
      watchCsp(page, violations);
      await use(violations);
      expect(violations, 'bloqueios da Content-Security-Policy').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };

export const DEMO_PASSWORD = 'jogador123';

let accounts = 0;

export function uniqueEmail(name) {
  accounts += 1;
  return `${name.toLowerCase()}.${Date.now()}.${accounts}@exemplo.com`;
}

// Senha valida para contas novas (pelo menos 8 caracteres, fora da lista de
// senhas comuns).
export const NEW_PASSWORD = 'dragao-de-bronze-42';

export async function login(page, email, password = DEMO_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

export async function register(page, { name, email, password = NEW_PASSWORD }) {
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Cadastrar' }).click();
}

// O aviso (toast) fica na regiao viva do topo da tela.
export function toast(page) {
  return page.getByRole('status').filter({ has: page.locator('.toast') });
}

// Os confirm() das acoes destrutivas sao aceitos.
export function acceptDialogs(page) {
  page.on('dialog', (dialog) => dialog.accept());
}
