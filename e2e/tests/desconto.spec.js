import { expect, login, resetDemo, test, watchCsp } from './fixtures.js';
import { parseMoneyText } from './money.js';

// O evento criado aqui mudaria os precos dos outros testes: a demonstracao
// volta ao estado inicial antes e depois.
test.beforeEach(() => resetDemo());
test.afterEach(() => resetDemo());

test('Mestre cria uma feira com desconto em poções e o jogador paga o preço com desconto', async ({ page, browser, cspViolations }) => {
  test.setTimeout(120000);
  const masterContext = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.99' } });
  const master = await masterContext.newPage();
  watchCsp(master, cspViolations);
  await login(master, 'mestre@lojarpg.local', 'mestre123');
  await master.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Mestre' }).click();
  await master.getByRole('tab', { name: 'Vendedores' }).click();

  const form = master.locator('form', { has: master.getByRole('heading', { name: 'Novo desconto' }) });
  await form.getByLabel('Nome').fill('Feira na cidade');
  await form.getByLabel('Desconto (%)').fill('20');
  await form.getByLabel('Categoria').selectOption({ label: 'Poções' });
  await form.getByRole('button', { name: 'Criar desconto' }).click();
  await expect(master.locator('.toast')).toHaveText('Desconto criado.');

  await page.goto('/');
  await page.getByRole('button', { name: /Entrar como jogador/ }).click();
  await expect(page.locator('.discount-banner')).toContainText('Feira na cidade: 20% em Poções');
  const potion = page.locator('.item-card', { hasText: 'Poção de Cura' });
  await expect(potion.locator('.price')).toContainText('-20% · Feira na cidade');
  await expect(potion.locator('.price s')).toHaveText('50 PO');

  const goldBadge = page.locator('.section-heading .gold-badge');
  const goldBefore = parseMoneyText(await goldBadge.textContent());
  await potion.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Finalizar compra' }).click();
  await expect(page.locator('.toast')).toHaveText('Compra concluída com sucesso.');
  await expect.poll(async () => parseMoneyText(await goldBadge.textContent())).toBe(goldBefore - 4000);

  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Compras' }).click();
  await expect(page.locator('.history-entry').first()).toContainText('1x Poção de Cura (40 PO)');

  await masterContext.close();
});
