import { readFileSync } from 'node:fs';
import { MAIL_OUTBOX } from '../playwright.config.js';
import { expect, login, register, test, uniqueEmail } from './fixtures.js';

function resetLinkFor(email) {
  let lines = [];
  try {
    lines = readFileSync(MAIL_OUTBOX, 'utf8').trim().split('\n').filter(Boolean);
  } catch (_error) {
    return null;
  }
  const mail = lines.map((line) => JSON.parse(line)).reverse().find((entry) => entry.to === email);
  return mail?.text.match(/https?:\/\/\S+\/redefinir-senha#token=\S+/)?.[0] || null;
}

test('jogador esquece a senha, cria outra pelo link do e-mail e entra com ela', async ({ page }) => {
  const email = uniqueEmail('esquecido');
  await page.goto('/');
  await register(page, { name: 'Esquecido', email });
  await expect(page.getByRole('heading', { name: 'Minhas mesas' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();

  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  // Sem esperar a tela nova, o e-mail podia ir para o campo da tela de login,
  // que ainda estava na pagina, e o pedido saia vazio.
  await expect(page.getByRole('heading', { name: 'Esqueci minha senha' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  const sent = page.getByRole('status').filter({ hasText: 'Se o e-mail estiver cadastrado' });
  const formError = page.locator('.form-error');
  await expect(sent.or(formError)).toBeVisible();
  if (await formError.isVisible()) {
    throw new Error(`O pedido de senha nova mostrou o erro: ${await formError.textContent()}`);
  }

  await expect.poll(() => resetLinkFor(email)).not.toBeNull();
  const link = new URL(resetLinkFor(email));
  await page.goto(`${link.pathname}${link.hash}`);
  // O token sai da barra de endereço assim que a tela o lê.
  await expect(page).toHaveURL(/\/redefinir-senha$/);
  await page.getByLabel('Senha nova', { exact: true }).fill('farol-da-baia-azul');
  await page.getByLabel('Repita a senha nova').fill('farol-da-baia-azul');
  await page.getByRole('button', { name: 'Salvar senha nova' }).click();
  await expect(page.getByRole('heading', { name: 'Senha nova criada' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await login(page, email, 'farol-da-baia-azul');
  await expect(page.getByRole('heading', { name: 'Minhas mesas' })).toBeVisible();
});
