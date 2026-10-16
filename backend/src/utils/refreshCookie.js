import { env } from '../config/env.js';

// O refresh token pode ir num cookie que o JavaScript da pagina nao le
// (httpOnly), em vez do corpo da resposta, que o front guardava no
// localStorage. O front escolhe pelo cabecalho X-Refresh-Transport: cookie;
// sem ele, a API segue como antes (clientes antigos e o modo padrao do site).
export const REFRESH_COOKIE = 'lojarpg_refresh';
const COOKIE_PATH = '/auth';

export function wantsRefreshCookie(req) {
  return req.get('x-refresh-transport') === 'cookie';
}

export function readRefreshCookie(req) {
  const header = req.get('cookie') || '';

  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');

    if (name === REFRESH_COOKIE) {
      return decodeURIComponent(value.join('='));
    }
  }

  return undefined;
}

function cookieAttributes(maxAgeSeconds) {
  const sameSite = env.refreshCookieSameSite;
  // SameSite=None exige Secure; fora de producao (HTTP local) o cookie sai sem.
  const secure = env.nodeEnv === 'production' || sameSite === 'none';
  return [
    `Path=${COOKIE_PATH}`,
    'HttpOnly',
    `SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`,
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : [])
  ].join('; ');
}

export function setRefreshCookie(res, token) {
  res.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(env.refreshTokenExpiresInDays * 24 * 60 * 60)}`
  );
}

export function clearRefreshCookie(res) {
  res.append('Set-Cookie', `${REFRESH_COOKIE}=; ${cookieAttributes(0)}`);
}
