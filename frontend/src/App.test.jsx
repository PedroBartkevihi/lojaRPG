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
    'GET /campaigns/7/items': () => ({ items: [] })
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
