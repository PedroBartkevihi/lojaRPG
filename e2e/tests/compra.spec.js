import { expect, test } from './fixtures.js';
import { parseMoneyText } from './money.js';

test('jogador compra com clique duplo e paga uma vez só', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar como jogador/ }).click();
  await expect(page.getByRole('heading', { name: 'Loja da campanha' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  const goldBadge = page.locator('.section-heading .gold-badge');
  await expect(goldBadge).toContainText('PO');
  const goldBefore = parseMoneyText(await goldBadge.textContent());

  await nav.getByRole('button', { name: 'Compras' }).click();
  await expect(page.getByRole('heading', { name: 'Compras realizadas' })).toBeVisible();
  await expect(page.locator('.history-list')).toBeVisible();
  const purchasesBefore = await page.locator('.history-entry').count();

  await nav.getByRole('button', { name: 'Loja' }).click();
  const potion = page.locator('.item-card', { hasText: 'Poção de Cura' });
  await potion.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.locator('.cart-line', { hasText: 'Poção de Cura' })).toBeVisible();

  // O clique duplo chegava antes de o botão redesenhar desativado e fazia
  // duas compras (corrigido no PR #11).
  await page.getByRole('button', { name: 'Finalizar compra' }).dblclick();
  await expect(page.locator('.toast')).toHaveText('Compra concluída com sucesso.');
  await expect.poll(async () => parseMoneyText(await goldBadge.textContent())).toBe(goldBefore - 5000);

  await nav.getByRole('button', { name: 'Compras' }).click();
  await expect(page.locator('.history-entry')).toHaveCount(purchasesBefore + 1);
  await expect(page.locator('.history-entry').first()).toContainText('1x Poção de Cura');

  await nav.getByRole('button', { name: 'Inventário' }).click();
  await expect(page.locator('.inventory-item', { hasText: 'Poção de Cura' })).toBeVisible();
});
