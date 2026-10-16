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

describe('envio de imagem do item', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubUpload(cloudinaryReply) {
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/campaigns/7/uploads/item-image')) {
        return reply(200, {
          uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload',
          fields: { api_key: '123', timestamp: 1, signature: 'abc', folder: 'lojarpg/mesa-7' },
          maxBytes: 10
        });
      }
      return cloudinaryReply;
    });
    vi.stubGlobal('fetch', fetchMock);
    return createApi(() => 'token', vi.fn(), () => 'refresh', vi.fn(), () => 7);
  }

  it('manda o arquivo com os campos assinados e devolve a URL segura', async () => {
    const api = stubUpload(reply(200, { secure_url: 'https://res.cloudinary.com/demo/escudo.webp' }));
    const file = new File(['12345'], 'escudo.png', { type: 'image/png' });

    await expect(api.uploadItemImage(file)).resolves.toBe('https://res.cloudinary.com/demo/escudo.webp');
    const [url, options] = fetch.mock.calls[1];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    expect(options.headers).toBeUndefined();
    expect(options.body.get('signature')).toBe('abc');
    expect(options.body.get('file')).toBe(file);
  });

  it('recusa arquivo acima do limite e mostra o erro do armazenamento', async () => {
    const api = stubUpload(reply(400, { error: { message: 'Invalid image file' } }));

    await expect(api.uploadItemImage(new File(['grande demais'], 'mapa.png', { type: 'image/png' }))).rejects.toThrow('mais de 0 MB');
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(api.uploadItemImage(new File(['ok'], 'mapa.png', { type: 'image/png' }))).rejects.toThrow(
      'O envio da imagem falhou: Invalid image file'
    );
  });
});

describe('refresh token em cookie (VITE_REFRESH_COOKIE)', () => {
  function cookieSetup({ refreshStatus = 200 } = {}) {
    const store = { token: 'access-velho', refreshToken: null };
    const onUnauthorized = vi.fn();
    const onTokenRefresh = vi.fn((data) => {
      store.token = data.accessToken;
    });
    const fetchMock = vi.fn(async (url, options = {}) => {
      const { pathname } = new URL(url);
      if (pathname === '/auth/refresh') {
        return refreshStatus === 200 ? reply(200, { accessToken: 'access-novo' }) : reply(401, { message: 'Refresh token inválido ou expirado.' });
      }
      if (pathname === '/auth/login') {
        return reply(200, { accessToken: 'access-1', user: { name: 'Lia' } });
      }
      return options.headers?.Authorization === 'Bearer access-novo' ? reply(200, { campaigns: [] }) : reply(401, { message: 'Token inválido ou expirado.' });
    });
    vi.stubGlobal('fetch', fetchMock);
    const api = createApi(() => store.token, onUnauthorized, () => store.refreshToken, onTokenRefresh, () => '1', { refreshCookie: true });
    return { api, store, fetchMock, onUnauthorized, onTokenRefresh };
  }

  it('manda o cookie só para /auth, com o cabeçalho do modo, e renova sem refresh token no corpo', async () => {
    const { api, fetchMock, onUnauthorized } = cookieSetup();

    await api.login({ email: 'lia@lojarpg.local', password: 'x' });
    await expect(api.listCampaigns()).resolves.toEqual({ campaigns: [] });

    const calls = fetchMock.mock.calls.map(([url, options]) => [new URL(url).pathname, options]);
    for (const [path, options] of calls) {
      const auth = path.startsWith('/auth/');
      expect(options.credentials).toBe(auth ? 'include' : undefined);
      expect(options.headers['X-Refresh-Transport']).toBe(auth ? 'cookie' : undefined);
    }
    const refresh = calls.find(([path]) => path === '/auth/refresh')[1];
    expect(JSON.parse(refresh.body)).toEqual({});
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('manda uma vez o refresh token antigo do localStorage para trocar pelo cookie', async () => {
    const { api, store, fetchMock } = cookieSetup();
    store.refreshToken = 'refresh-antigo';

    await api.listCampaigns();
    const refresh = fetchMock.mock.calls.find(([url]) => url.endsWith('/auth/refresh'))[1];
    expect(JSON.parse(refresh.body)).toEqual({ refreshToken: 'refresh-antigo' });
  });

  it('encerra a sessão quando o cookie é recusado e nenhuma outra aba renovou', async () => {
    const { api, onUnauthorized } = cookieSetup({ refreshStatus: 401 });

    await expect(api.listCampaigns()).rejects.toThrow('Token inválido ou expirado.');
    expect(onUnauthorized).toHaveBeenCalled();
  });
});

describe('canal de eventos da mesa (SSE)', () => {
  function streamOf(chunks) {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      }
    });
  }

  it('lê eventos quebrados entre pedaços e ignora comentários', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, body: streamOf(['retry: 5000\n\nevent: rea', 'dy\ndata: {}\n\n: ping\n\nevent: changed\ndata: {}\n', '\n']) })));
    const api = createApi(() => 'token', vi.fn(), () => 'refresh', vi.fn(), () => 7);
    const events = [];

    await api.streamCampaignEvents({ onEvent: (name) => events.push(name), signal: new AbortController().signal });

    expect(events).toEqual(['ready', 'changed']);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/campaigns\/7\/events$/);
    expect(options.headers.Authorization).toBe('Bearer token');
  });

  it('renova a sessão uma vez num 401 e reabre o canal com o token novo', async () => {
    const store = { token: 'velho' };
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      if (url.endsWith('/auth/refresh')) return reply(200, { accessToken: 'novo', refreshToken: 'r2' });
      if (options.headers?.Authorization === 'Bearer novo') return { ok: true, status: 200, body: streamOf(['event: ready\n\n']) };
      return reply(401, { message: 'Token inválido ou expirado.' });
    }));
    const api = createApi(() => store.token, vi.fn(), () => 'r1', (data) => { store.token = data.accessToken; }, () => 7);
    const events = [];

    await api.streamCampaignEvents({ onEvent: (name) => events.push(name), signal: new AbortController().signal });
    expect(events).toEqual(['ready']);
  });
});
