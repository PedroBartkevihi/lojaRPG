import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CartPanel from './CartPanel.jsx';

describe('CartPanel', () => {
  it('bloqueia finalizacao quando o carrinho esta vazio', () => {
    render(<CartPanel cart={[]} setCart={vi.fn()} character={{ id: 1 }} onCheckout={vi.fn()} />);

    expect(screen.getByText('Nenhum item selecionado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finalizar compra/i })).toBeDisabled();
  });

  it('exibe total e chama checkout quando ha personagem e itens', async () => {
    const user = userEvent.setup();
    const onCheckout = vi.fn();
    const cart = [
      {
        item: { id: 1, name: 'Pocao de Cura', price: 50, stock: 5 },
        quantity: 2
      }
    ];

    render(<CartPanel cart={cart} setCart={vi.fn()} character={{ id: 7 }} onCheckout={onCheckout} />);

    expect(screen.getByText('Pocao de Cura')).toBeInTheDocument();
    expect(screen.getByText('100 ouro')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /finalizar compra/i }));

    expect(onCheckout).toHaveBeenCalledTimes(1);
  });
});
