import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ShopSwitch from './ShopSwitch.jsx';
import CartPanel from './CartPanel.jsx';

describe('loja aberta ou fechada', () => {
  it('persiste o estado e atualiza a mesa após a confirmação da API', async () => {
    const api = { setShopState: vi.fn().mockResolvedValue({}) };
    const onChanged = vi.fn();
    const showNotice = vi.fn();
    const { rerender } = render(<ShopSwitch api={api} shopOpen onChanged={onChanged} showNotice={showNotice} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar loja' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(api.setShopState).toHaveBeenCalledWith({ shopOpen: false });
    rerender(<ShopSwitch api={api} shopOpen={false} onChanged={onChanged} showNotice={showNotice} />);
    expect(screen.getByRole('button', { name: 'Abrir loja' })).toBeEnabled();
  });

  it('bloqueia a compra de um carrinho já montado quando a loja fecha', () => {
    render(<CartPanel cart={[{ item: { id: 1, name: 'Poção', price: 10, stock: 2 }, quantity: 1 }]}
      setCart={vi.fn()} character={{ gold: 50 }} onCheckout={vi.fn()} shopOpen={false} />);
    expect(screen.getByRole('button', { name: 'Finalizar compra' })).toBeDisabled();
  });
});
