import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { reportClientError, resetErrorReporting } from './errorReporting.js';

beforeEach(() => {
  resetErrorReporting();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  window.history.replaceState(null, '', '/shop?search=pocao#topo');
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('relato de erros do navegador', () => {
  it('manda mensagem, pilha e a rota sem query nem fragmento, uma vez por erro', () => {
    reportClientError({ message: 'x is undefined', stack: 'at ShopPage' });
    reportClientError({ message: 'x is undefined', stack: 'at ShopPage' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/client-errors$/);
    expect(JSON.parse(options.body)).toEqual({ message: 'x is undefined', stack: 'at ShopPage', path: '/shop', kind: 'error' });
  });

  it('não manda o código do convite que está na rota', () => {
    window.history.replaceState(null, '', '/convite/ABCD1234');
    reportClientError({ message: 'falha no convite' });

    expect(JSON.parse(fetch.mock.calls[0][1].body).path).toBe('/convite/:code');
  });

  it('a tela que quebra mostra um aviso e relata o erro', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken() {
      throw new Error('Falha ao desenhar');
    }

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado nesta tela');
    expect(screen.getByRole('button', { name: 'Ir para as mesas' })).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ message: 'Falha ao desenhar', kind: 'render' });
    spy.mockRestore();
  });

  it('voltar no navegador tira o aviso e desenha de novo a tela', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let broken = true;
    function Screen() {
      if (broken) {
        throw new Error('Falha só nesta rota');
      }
      return <p>Mesas</p>;
    }

    render(
      <ErrorBoundary>
        <Screen />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    broken = false;
    act(() => {
      window.history.pushState(null, '', '/mesas');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Mesas')).toBeInTheDocument();
    spy.mockRestore();
  });
});
