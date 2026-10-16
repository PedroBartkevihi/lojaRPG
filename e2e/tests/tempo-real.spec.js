import { expect, login, resetDemo, test, watchCsp } from './fixtures.js';
import { parseMoneyText } from './money.js';

test.beforeEach(() => resetDemo());

// Com o canal SSE aberto, a consulta periodica passa para 30 s: o ouro dado
// pelo Mestre so aparece em menos de 5 s se o aviso em tempo real funcionar.
test('ouro dado pelo Mestre aparece na hora para o jogador', async ({ page, browser, cspViolations }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar como jogador/ }).click();
  const goldBadge = page.locator('.section-heading .gold-badge');
  await expect(goldBadge).toContainText('PO');
  const goldBefore = parseMoneyText(await goldBadge.textContent());

  // Espera o canal abrir (a primeira batida ja passou e a tela esta parada).
  await page.waitForTimeout(1500);

  const masterContext = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.120' } });
  const master = await masterContext.newPage();
  watchCsp(master, cspViolations);
  await login(master, 'mestre@lojarpg.local', 'mestre123');
  await master.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Mestre' }).click();
  const rewards = master.locator('.rewards-panel');
  for (const name of ['Borin Escudoforte', 'Lia Brasa']) {
    await rewards.getByRole('checkbox', { name }).uncheck();
  }
  await rewards.getByLabel('Moeda: Valor da recompensa').selectOption('PO');
  await rewards.getByRole('spinbutton', { name: 'Valor da recompensa' }).fill('7');
  await rewards.getByLabel('Motivo', { exact: true }).fill('Achado na estrada');
  await rewards.getByRole('button', { name: 'Dar moedas' }).click();
  await expect(master.locator('.toast')).toContainText('Aria Luaferro');

  await expect.poll(async () => parseMoneyText(await goldBadge.textContent()), { timeout: 5000 }).toBe(goldBefore + 700);
  await masterContext.close();
});
