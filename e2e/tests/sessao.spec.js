import { expect, login, test } from './fixtures.js';

const nav = (page) => page.getByRole('navigation', { name: 'Navegação principal' });
const COOKIE_MODE = process.env.E2E_REFRESH_COOKIE === 'true';

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

  if (COOKIE_MODE) {
    // O refresh token fica só no cookie httpOnly, fora do alcance da página.
    expect(refreshBefore).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('lojaRpgRefreshToken'))).toBeNull();
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'lojarpg_refresh')).toMatchObject({ httpOnly: true, path: '/auth' });
    expect(await page.evaluate(() => document.cookie)).not.toContain('lojarpg_refresh');
  } else {
    expect(await page.evaluate(() => localStorage.getItem('lojaRpgRefreshToken'))).not.toBe(refreshBefore);
  }
  await expect(page.getByRole('heading', { name: 'Entrar na loja' })).toHaveCount(0);
});

test('sessão recusada pela API volta para a tela de entrada', async ({ page }) => {
  await login(page, 'lia@lojarpg.local');
  await expect(page.getByRole('heading', { name: 'Loja da campanha' })).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem('lojaRpgToken', 'token-vencido');
    localStorage.setItem('lojaRpgRefreshToken', 'refresh-revogado');
  });
  if (COOKIE_MODE) {
    await page.context().clearCookies();
  }
  // Recarregar (e nao clicar numa aba): a atualizacao automatica pode
  // encerrar a sessao antes do clique, e o teste ficaria dependendo de tempo.
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Entrar na loja' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
