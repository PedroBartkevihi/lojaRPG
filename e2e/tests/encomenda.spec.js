import { expect, login, test, watchCsp } from './fixtures.js';
import { parseMoneyText } from './money.js';

test('jogador encomenda um item fora do catálogo e o Mestre entrega', async ({ page, browser, cspViolations }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar como jogador/ }).click();
  await expect(page.getByRole('heading', { name: 'Loja da campanha' })).toBeVisible();
  const goldBadge = page.locator('.section-heading .gold-badge');
  await expect(goldBadge).toContainText('PO');
  const goldBefore = parseMoneyText(await goldBadge.textContent());

  const panel = page.locator('.item-requests');
  const description = `Lanterna de vidro azul ${Date.now()}`;
  await panel.getByLabel(/procura/).fill(description);
  await panel.getByLabel('Moeda: Paga até').selectOption('PO');
  await panel.getByRole('spinbutton', { name: 'Paga até' }).fill('20');
  await panel.getByRole('button', { name: 'Encomendar' }).click();
  await expect(page.locator('.toast')).toHaveText('Encomenda enviada ao Mestre.');
  await expect(panel.locator('li', { hasText: description })).toContainText('Esperando o Mestre');

  const masterContext = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.88' } });
  const master = await masterContext.newPage();
  watchCsp(master, cspViolations);
  await login(master, 'mestre@lojarpg.local', 'mestre123');
  await master.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Mestre' }).click();
  await master.getByRole('tab', { name: 'Encomendas' }).click();

  const form = master.getByRole('form', { name: `Responder: ${description}` });
  await form.getByLabel('Nome do item').fill('Lanterna Azul');
  await form.getByLabel('Moeda: Preço cobrado').selectOption('PO');
  await form.getByRole('spinbutton', { name: 'Preço cobrado' }).fill('15');
  await form.getByLabel('Nota para o jogador (opcional)').fill('Feita pelo vidreiro do porto.');
  await form.getByRole('button', { name: 'Aprovar e entregar' }).click();
  await expect(master.locator('.toast')).toHaveText('Encomenda entregue a Aria Luaferro.');

  // A tela do jogador muda pela atualização automática.
  await expect(panel.locator('li', { hasText: description })).toContainText('Entregue: Lanterna Azul por 15 PO', {
    timeout: 15000
  });
  await expect.poll(async () => parseMoneyText(await goldBadge.textContent()), { timeout: 15000 }).toBe(goldBefore - 1500);
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Inventário' }).click();
  await expect(page.locator('.inventory-item', { hasText: 'Lanterna Azul' })).toBeVisible();

  await masterContext.close();
});
