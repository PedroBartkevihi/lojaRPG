import { expect, login, test } from './fixtures.js';

const nav = (page) => page.getByRole('navigation', { name: 'Navegação principal' });

test('token de acesso vencido é renovado sem tirar o jogador da loja', async ({ page }) => {
  await login(page, 'lia@lojarpg.local');
  await expect(page.getByRole('heading', { name: 'Loja da campanha' })).toBeVisible();
  const refreshBefore = await page.evaluate(() => localStorage.getItem('lojaRpgRefreshToken'));

  // Um token que a API recusa faz a próxima requisição receber 401, renovar a
  // sessão com o refresh token e repetir a chamada.
  await page.evaluate(() => localStorage.setItem('lojaRpgToken', 'token-vencido'));
  await nav(page).getByRole('button', { name: 'Compras' }).click();
  await expect(page.getByRole('heading', { name: 'Compras realizadas' })).toBeVisible();
  await expect(page.locator('.history-list')).toBeVisible();

  await expect.poll(() => page.evaluate(() => localStorage.getItem('lojaRpgToken'))).not.toBe('token-vencido');
  expect(await page.evaluate(() => localStorage.getItem('lojaRpgRefreshToken'))).not.toBe(refreshBefore);
  await expect(page.getByRole('heading', { name: 'Entrar na loja' })).toHaveCount(0);
});

test('sessão recusada pela API volta para a tela de entrada', async ({ page }) => {
  await login(page, 'lia@lojarpg.local');
  await expect(page.getByRole('heading', { name: 'Loja da campanha' })).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem('lojaRpgToken', 'token-vencido');
    localStorage.setItem('lojaRpgRefreshToken', 'refresh-revogado');
  });
  await nav(page).getByRole('button', { name: 'Compras' }).click();

  await expect(page.getByRole('heading', { name: 'Entrar na loja' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
