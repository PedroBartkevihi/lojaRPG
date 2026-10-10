import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PurchaseHistory from './PurchaseHistory.jsx';

describe('PurchaseHistory', () => {
  it('lista as compras do personagem', async () => {
    const api = {
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
    expect(api.myPurchases).toHaveBeenCalledWith({ characterId: 2 });
  });

  it('manda criar o personagem em vez de mostrar erro para quem ainda não tem um', () => {
    const api = { myPurchases: vi.fn() };

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
