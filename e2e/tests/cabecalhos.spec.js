import { expect, test } from './fixtures.js';

test('site sai com os cabeçalhos de segurança e a CSP bloqueia script injetado', async ({ page, cspViolations }) => {
  const response = await page.goto('/');
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-frame-options']).toBe('DENY');

  // Um script inline (como um XSS que escapasse do React) não roda.
  const ran = await page.evaluate(() => {
    window.injected = false;
    const script = document.createElement('script');
    script.textContent = 'window.injected = true;';
    document.head.appendChild(script);
    return window.injected;
  });
  expect(ran).toBe(false);

  // O bloqueio esperado sai da lista, para o teste não reprovar por ele.
  await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
  cspViolations.length = 0;
  await expect(page.getByRole('heading', { name: 'Entrar na loja' })).toBeVisible();
});
