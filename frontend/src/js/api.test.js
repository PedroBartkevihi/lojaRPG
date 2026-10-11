import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './api.js';

function reply(status, body) {
  return { ok: status < 400, status, text: async () => JSON.stringify(body) };
}

// Sessao guardada como no App: os tokens ficam fora da API e sao lidos a cada
// requisicao.
function setup({ refreshStatus = 200 } = {}) {
  const store = { token: 'access-velho', refreshToken: 'refresh-1' };
  const onUnauthorized = vi.fn();
  const onTokenRefresh = vi.fn((data) => {
    store.token = data.accessToken;
    store.refreshToken = data.refreshToken;
  });

  const fetchMock = vi.fn(async (url, options = {}) => {
    const { pathname } = new URL(url);

    if (pathname === '/auth/refresh') {
      await new Promise((resolve) => setTimeout(resolve, 20));

      if (refreshStatus === 'rede') {
        throw new TypeError('Failed to fetch');
      }

      if (refreshStatus === 502) {
        // Pagina de erro do proxy, em HTML.
        return { ok: false, status: 502, text: async () => '<html>Bad Gateway</html>' };
      }

      return refreshStatus === 200
        ? reply(200, { accessToken: 'access-novo', refreshToken: 'refresh-2' })
        : reply(refreshStatus, { message: 'Refresh token inválido ou expirado.' });
    }

    if (pathname === '/auth/login') {
      return reply(401, { message: 'Email ou senha inválidos.' });
    }

    return options.headers?.Authorization === 'Bearer access-novo'
      ? reply(200, { campaigns: [] })
      : reply(401, { message: 'Token inválido ou expirado.' });
  });

  vi.stubGlobal('fetch', fetchMock);
  const api = createApi(
    () => store.token,
    onUnauthorized,
    () => store.refreshToken,
    onTokenRefresh,
    () => '1'
  );

  const refreshCalls = () => fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'));
  return { api, store, onUnauthorized, onTokenRefresh, refreshCalls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renovação da sessão', () => {
  it('renova uma vez só quando várias requisições recebem 401 juntas', async () => {
    const { api, onUnauthorized, onTokenRefresh, refreshCalls } = setup();

    const results = await Promise.all([api.listCampaigns(), api.myCharacter(), api.listItems(), api.myPurchases()]);

    expect(results).toHaveLength(4);
    expect(refreshCalls()).toHaveLength(1);
    expect(onTokenRefresh).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('repete com o token novo quando outra requisição já renovou', async () => {
    const { api, store, onUnauthorized, refreshCalls } = setup();

    await api.listCampaigns();
    // Uma resposta atrasada, enviada ainda com o token antigo.
    store.token = 'access-velho';
    store.refreshToken = 'refresh-1';
    const late = api.listCampaigns();
    store.token = 'access-novo';
    store.refreshToken = 'refresh-2';

    await expect(late).resolves.toEqual({ campaigns: [] });
    expect(refreshCalls()).toHaveLength(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('encerra a sessão quando a renovação é recusada', async () => {
    const { api, onUnauthorized } = setup({ refreshStatus: 401 });

    await expect(api.listCampaigns()).rejects.toThrow('Token inválido ou expirado.');
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it.each([
    ['a API está fora (503)', 503],
    ['o limite de requisições estourou (429)', 429],
    ['o proxy devolve uma página de erro (502)', 502],
    ['a rede cai', 'rede']
  ])('mantém a sessão quando %s durante a renovação', async (_caso, refreshStatus) => {
    const { api, onUnauthorized } = setup({ refreshStatus });

    await expect(api.listCampaigns()).rejects.toThrow(/tente de novo/i);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('senha errada no login não conta como sessão vencida', async () => {
    const { api, store, onUnauthorized, refreshCalls } = setup();
    store.token = null;
    store.refreshToken = null;

    await expect(api.login({ email: 'a@b.com', password: 'errada' })).rejects.toThrow('Email ou senha inválidos.');
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(refreshCalls()).toHaveLength(0);
  });
});
