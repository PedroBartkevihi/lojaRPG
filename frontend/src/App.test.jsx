import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const mesa = { id: 7, name: 'Mesa do Caio', role: 'JOGADOR', memberCount: 3 };

// API falsa: so responde o que o convite e a loja precisam.
function fakeApi() {
  const calls = [];
  let joined = false;

  const session = (name) => ({
    user: { id: 9, name, email: 'novo@exemplo.com' },
    accessToken: 'access-1',
    refreshToken: 'refresh-1'
  });

  const routes = {
    'POST /auth/register': (body) => session(body.name),
    'POST /auth/login': () => session('Jogador Antigo'),
    'GET /campaigns': () => ({ campaigns: joined ? [mesa] : [] }),
    'POST /campaigns/join': () => {
      joined = true;
      return { message: 'Você entrou na mesa Mesa do Caio.', campaign: mesa };
    },
    'GET /campaigns/7/characters/me': () => ({ characters: [] }),
    'GET /campaigns/7/items': () => ({ items: [] }),
    // Sem esta rota a loja recebia {} e quebrava em shops.find quando a resposta
    // chegava antes do fim do teste (falha intermitente no CI).
    'GET /campaigns/7/shops': () => ({ shops: [] }),
    'GET /campaigns/7/catalog/categories': () => ({ categories: [] }),
    'GET /campaigns/7/catalog/rarities': () => ({ rarities: [] }),
    'GET /campaigns/7/discounts': () => ({ discounts: [] })
  };

  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method || 'GET';
    const { pathname } = new URL(url);
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ route: `${method} ${pathname}`, body });
    const handler = routes[`${method} ${pathname}`];

    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(handler ? handler(body) : {})
    };
  });

  return { calls, fetchMock };
}

let api;

beforeEach(() => {
  localStorage.clear();
  api = fakeApi();
  vi.stubGlobal('fetch', api.fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillAndSubmit(user, fields, button) {
  for (const [label, value] of Object.entries(fields)) {
    await user.type(screen.getByLabelText(label), value);
  }
  await user.click(screen.getByRole('button', { name: button }));
}

describe('convite por link', () => {
  it('entra na mesa depois de criar a conta pelo link', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/convite/ABCD1234');
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await fillAndSubmit(user, { Nome: 'Lia', Email: 'lia@exemplo.com', Senha: 'segredo1' }, 'Cadastrar');

    await waitFor(() => expect(window.location.pathname).toBe('/shop'));
    expect(api.calls).toContainEqual({ route: 'POST /campaigns/join', body: { inviteCode: 'ABCD1234' } });
    expect(await screen.findByText('Mesa do Caio')).toBeInTheDocument();
    expect(localStorage.getItem('lojaRpgInvite')).toBeNull();
    // O aviso e anunciado por leitores de tela.
    expect(screen.getAllByRole('status').map((element) => element.textContent)).toContain(
      'Você entrou na mesa Mesa do Caio.'
    );
  });

  it('entra na mesa quando a pessoa troca para o login antes de entrar', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/convite/ABCD1234');
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await user.click(screen.getByRole('button', { name: 'Já tenho acesso' }));
    await fillAndSubmit(user, { Email: 'antigo@exemplo.com', Senha: 'segredo1' }, 'Entrar');

    await waitFor(() => expect(window.location.pathname).toBe('/shop'));
    expect(api.calls).toContainEqual({ route: 'POST /campaigns/join', body: { inviteCode: 'ABCD1234' } });
  });

  it('sem convite pendente, o login leva às mesas sem entrar em nenhuma', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/login');
    render(<App />);

    await fillAndSubmit(user, { Email: 'antigo@exemplo.com', Senha: 'segredo1' }, 'Entrar');

    await waitFor(() => expect(window.location.pathname).toBe('/mesas'));
    expect(api.calls.map((call) => call.route)).not.toContain('POST /campaigns/join');
  });

  it('na tela do convite, esconde os botões da demonstração', () => {
    window.history.pushState({}, '', '/convite/ABCD1234');
    const { unmount } = render(<App />);

    expect(screen.queryByRole('button', { name: /entrar como jogador/i })).not.toBeInTheDocument();
    expect(screen.getByText(/participar da mesa do convite/i)).toBeInTheDocument();

    unmount();
    localStorage.clear();
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(screen.getByRole('button', { name: /entrar como jogador/i })).toBeInTheDocument();
  });

  it('esquece o convite aberto há mais de um dia', async () => {
    const user = userEvent.setup();
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    localStorage.setItem('lojaRpgInvite', JSON.stringify({ code: 'ABCD1234', savedAt: twoDaysAgo }));
    window.history.pushState({}, '', '/login');
    render(<App />);

    expect(screen.queryByText(/participar da mesa do convite/i)).not.toBeInTheDocument();
    await fillAndSubmit(user, { Email: 'antigo@exemplo.com', Senha: 'segredo1' }, 'Entrar');

    await waitFor(() => expect(window.location.pathname).toBe('/mesas'));
    expect(api.calls.map((call) => call.route)).not.toContain('POST /campaigns/join');
    expect(localStorage.getItem('lojaRpgInvite')).toBeNull();
  });
});

describe('mesa por aba', () => {
  it('as requisições usam a mesa da tela, mesmo se outra aba trocar de mesa', async () => {
    const user = userEvent.setup();
    const mesas = [
      { id: 7, name: 'Mesa do Caio', role: 'MESTRE', memberCount: 1, inviteCode: 'AAAAAAAA' },
      { id: 8, name: 'Mesa da Lia', role: 'MESTRE', memberCount: 1, inviteCode: 'BBBBBBBB' }
    ];
    const paths = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const { pathname } = new URL(url);
        paths.push(pathname);
        const id = Number(pathname.split('/')[2]);
        const body =
          pathname === '/campaigns'
            ? { campaigns: mesas }
            : pathname.endsWith('/characters/me')
              ? { characters: [] }
              : pathname.endsWith('/catalog/categories')
                ? { categories: [] }
              : pathname.endsWith('/shops')
                ? { shops: [] }
              : pathname.endsWith('/items')
                ? { items: [] }
                : { campaign: mesas.find((entry) => entry.id === id), members: [] };
        return { ok: true, status: 200, text: async () => JSON.stringify(body) };
      })
    );
    localStorage.setItem('lojaRpgToken', 'access-1');
    localStorage.setItem('lojaRpgRefreshToken', 'refresh-1');
    localStorage.setItem('lojaRpgUser', JSON.stringify({ id: 9, name: 'Caio' }));
    localStorage.setItem('lojaRpgCampaign', '7');
    window.history.pushState({}, '', '/shop');
    render(<App />);

    await screen.findByText('Mesa do Caio');
    // Outra aba do mesmo navegador abre a Mesa da Lia.
    localStorage.setItem('lojaRpgCampaign', '8');
    paths.length = 0;
    await user.click(screen.getByRole('button', { name: /^mesa$/i }));

    await waitFor(() => expect(paths).toContain('/campaigns/7'));
    expect(paths.some((path) => path.startsWith('/campaigns/8'))).toBe(false);
  });
});

describe('senha nova pelo link do e-mail', () => {
  it('com uma sessão vencida no aparelho, a tela fica aberta e guarda o token do link', async () => {
    const user = userEvent.setup();
    localStorage.setItem('lojaRpgToken', 'access-vencido');
    localStorage.setItem('lojaRpgRefreshToken', 'refresh-vencido');
    localStorage.setItem('lojaRpgUser', JSON.stringify({ id: 9, name: 'Lia', email: 'lia@exemplo.com' }));
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        const { pathname } = new URL(url);
        calls.push({ route: `${options.method || 'GET'} ${pathname}`, body: options.body ? JSON.parse(options.body) : undefined });

        if (pathname === '/auth/reset-password') {
          return { ok: true, status: 200, text: async () => JSON.stringify({ message: 'Senha alterada. Entre com a senha nova.' }) };
        }

        // A sessão guardada no aparelho venceu: o resto é recusado, inclusive a renovação.
        return { ok: false, status: 401, text: async () => JSON.stringify({ message: 'Token inválido ou expirado.' }) };
      })
    );
    window.history.pushState({}, '', '/redefinir-senha#token=abc_DEF-123');
    render(<App />);

    await waitFor(() => expect(calls.map((call) => call.route)).toContain('POST /auth/refresh'));
    await waitFor(() => expect(localStorage.getItem('lojaRpgToken')).toBeNull());
    expect(window.location.pathname).toBe('/redefinir-senha');

    await fillAndSubmit(
      user,
      { 'Senha nova': 'farol-da-baia-azul', 'Repita a senha nova': 'farol-da-baia-azul' },
      'Salvar senha nova'
    );
    expect(calls).toContainEqual({
      route: 'POST /auth/reset-password',
      body: { token: 'abc_DEF-123', password: 'farol-da-baia-azul' }
    });

    await user.click(await screen.findByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });
});
