import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PurchaseHistory from './PurchaseHistory.jsx';

describe('PurchaseHistory', () => {
  it('mostra registros depois do quinquagesimo e nao perde a pagina ao atualizar a sessao', async () => {
    const user = userEvent.setup();
    const api = { listSessions: vi.fn().mockResolvedValue({ sessions: [] }), myPurchases: vi.fn(async ({ cursor }) => {
      const start = Number(cursor || 0);
      return {
        purchases: Array.from({ length: Math.min(25, 65 - start) }, (_, index) => ({
          id: 65 - start - index, totalValue: 1, purchasedAt: '2026-01-01T00:00:00Z', items: []
        })),
        pagination: { nextCursor: start + 25 < 65 ? String(start + 25) : null }
      };
    }) };
    const { rerender } = render(<PurchaseHistory api={api} character={{ id: 2 }} refreshKey={0} />);
    await screen.findByText('Compra #65');
    await user.click(screen.getByRole('button', { name: 'Mostrar mais: compras' }));
    await screen.findByText('Compra #16');
    await user.click(screen.getByRole('button', { name: 'Mostrar mais: compras' }));
    await screen.findByText('Compra #1');
    expect(api.myPurchases).toHaveBeenCalledTimes(3);
    rerender(<PurchaseHistory api={api} character={{ id: 2 }} refreshKey={1} />);
    expect(screen.getByText('Compra #1')).toBeInTheDocument();
    expect(api.myPurchases).toHaveBeenCalledTimes(3);
    await user.click(screen.getByRole('button', { name: 'Ver registros recentes: compras' }));
    await waitFor(() => expect(screen.queryByText('Compra #1')).not.toBeInTheDocument());
    expect(api.myPurchases).toHaveBeenCalledTimes(4);
  });

  it('ignora uma resposta antiga ao trocar de personagem', async () => {
    let oldResponse;
    const api = { listSessions: vi.fn().mockResolvedValue({ sessions: [] }), myPurchases: vi.fn(({ characterId }) => characterId === 2
      ? new Promise((resolve) => { oldResponse = resolve; })
      : Promise.resolve({ purchases: [{ id: 30, purchasedAt: '2026-01-01', totalValue: 1, items: [] }] })) };
    const { rerender } = render(<PurchaseHistory api={api} character={{ id: 2 }} />);
    rerender(<PurchaseHistory api={api} character={{ id: 3 }} />);
    await screen.findByText('Compra #30');
    await act(async () => oldResponse({ purchases: [{ id: 20, purchasedAt: '2026-01-01', totalValue: 1, items: [] }] }));
    expect(screen.queryByText('Compra #20')).not.toBeInTheDocument();
    expect(screen.getByText('Compra #30')).toBeInTheDocument();
  });

  it('lista as compras do personagem', async () => {
    const api = { listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
      myPurchases: vi.fn().mockResolvedValue({
        purchases: [
          {
            id: 4,
            purchasedAt: '2026-10-09T12:00:00Z',
            totalValue: 75,
            items: [{ id: 1, quantity: 3, itemName: 'Poção de Cura', unitPrice: 25 }]
          }
        ]
      })
    };

    render(<PurchaseHistory api={api} character={{ id: 2 }} />);

    expect(await screen.findByText('Compra #4')).toBeInTheDocument();
    expect(screen.getByText('3x Poção de Cura (25 ouro)')).toBeInTheDocument();
    expect(api.myPurchases).toHaveBeenCalledWith({ characterId: 2, limit: 25 });
  });

  it('manda criar o personagem em vez de mostrar erro para quem ainda não tem um', () => {
    const api = { listSessions: vi.fn().mockResolvedValue({ sessions: [] }), myPurchases: vi.fn() };

    render(
      <MemoryRouter>
        <PurchaseHistory api={api} character={null} needsCharacter />
      </MemoryRouter>
    );

    expect(screen.getByText(/ainda não tem personagem nesta mesa/i)).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma compra registrada.')).not.toBeInTheDocument();
    expect(api.myPurchases).not.toHaveBeenCalled();
  });
});
