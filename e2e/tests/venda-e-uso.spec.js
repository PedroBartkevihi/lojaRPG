import { acceptDialogs, expect, login, resetDemo, test } from './fixtures.js';
import { parseMoneyText } from './money.js';

// O teste conta com as 2 pocoes do Borin no seed: sem o reset, um retry depois
// de uma venda ja feita falharia sempre.
test.beforeEach(() => resetDemo());

test('jogador vende um item à loja e usa outro', async ({ page }) => {
  acceptDialogs(page);
  await login(page, 'borin@lojarpg.local');
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Inventário' }).click();

  const goldBadge = page.locator('.section-heading .gold-badge');
  const potions = page.locator('.inventory-item', { hasText: 'Poção de Cura' });
  await expect(potions).toContainText('2x');
  const goldBefore = parseMoneyText(await goldBadge.textContent());

  // A loja paga metade do preço (50 PO) por padrão.
  await potions.getByRole('button', { name: 'Vender' }).click();
  await expect(page.locator('.toast')).toContainText('Venda concluída: 1x Poção de Cura');
  await expect(potions).toContainText('1x');
  await expect.poll(async () => parseMoneyText(await goldBadge.textContent())).toBe(goldBefore + 2500);

  await potions.getByRole('button', { name: 'Usar' }).click();
  await expect(page.locator('.toast')).toHaveText('Item usado: 1x Poção de Cura.');
  await expect(potions).toHaveCount(0);

  // O histórico do personagem registra as duas movimentações.
  const history = page.locator('.inventory-history');
  await expect(history).toContainText('Vendeu 1x Poção de Cura por 25 PO');
  await expect(history).toContainText('Usou 1x Poção de Cura');
});
