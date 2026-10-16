import { expect, test } from './fixtures.js';

test('site é instalável: manifesto com ícones e service worker ativo', async ({ page, request }) => {
  await page.goto('/');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(manifestHref)).json();
  expect(manifest).toMatchObject({ name: 'lojaRPG', display: 'standalone', start_url: '/', lang: 'pt-BR' });
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
    expect(response.headers()['content-type']).toBe('image/png');
  }

  // O registro roda num script externo (a CSP bloqueia script inline).
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);

  // Sem modo offline: a página continua vindo da rede, e a API não passa
  // pelo cache do service worker.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Entrar na loja' })).toBeVisible();
});
