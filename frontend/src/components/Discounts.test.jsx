import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CartPanel from './CartPanel.jsx';
import DiscountBanner from './DiscountBanner.jsx';
import ItemCard from './ItemCard.jsx';
import DiscountsPanel from './admin/DiscountsPanel.jsx';

const potion = {
  id: 6, name: 'Poção de Cura', category: 'Poções', rarity: 'Comum', rarityRank: 1, description: '', stock: 5,
  price: 5000, finalPrice: 4000, discount: { id: 1, name: 'Feira na cidade', percent: 20 }
};

describe('descontos na loja', () => {
  it('mostra o preço de tabela riscado, o final e o nome do desconto', () => {
    render(<ItemCard item={potion} onAdd={vi.fn()} />);

    expect(screen.getByLabelText('Preço de tabela 50 PO')).toHaveTextContent('50 PO');
    expect(screen.getByText('40 PO')).toBeInTheDocument();
    expect(screen.getByText('-20% · Feira na cidade')).toBeInTheDocument();
  });

  it('o carrinho soma pelo preço com desconto', () => {
    render(<CartPanel cart={[{ item: potion, quantity: 2 }]} setCart={vi.fn()} character={{ id: 1 }} onCheckout={vi.fn()} />);

    expect(screen.getByText('40 PO cada (-20%)')).toBeInTheDocument();
    expect(screen.getByText('80 PO')).toBeInTheDocument();
  });

  it('a faixa mostra os eventos da mesa e só o desconto do personagem ativo', async () => {
    const api = {
      listDiscounts: vi.fn().mockResolvedValue({
        discounts: [
          { id: 1, name: 'Feira na cidade', percent: 20, category: 'Poções', characterId: null, isActive: true },
          { id: 2, name: 'Persuasão', percent: 10, category: null, characterId: 1, characterName: 'Aria', isActive: true },
          { id: 3, name: 'Do Borin', percent: 5, category: null, characterId: 2, characterName: 'Borin', isActive: true }
        ]
      })
    };
    render(<DiscountBanner api={api} liveKey={0} characterId={1} />);

    expect(await screen.findByText('Feira na cidade: 20% em Poções')).toBeInTheDocument();
    expect(screen.getByText('Persuasão: 10% em tudo para Aria')).toBeInTheDocument();
    expect(screen.queryByText(/Do Borin/)).not.toBeInTheDocument();
  });
});

describe('DiscountsPanel', () => {
  it('cria um evento por categoria e desliga um desconto', async () => {
    const user = userEvent.setup();
    const api = { createDiscount: vi.fn().mockResolvedValue({}), updateDiscount: vi.fn().mockResolvedValue({}) };
    const reload = vi.fn().mockResolvedValue();
    const discounts = [{ id: 4, name: 'Liquidação', percent: 30, category: null, characterId: null, isActive: true }];
    render(
      <DiscountsPanel
        api={api}
        discounts={discounts}
        categories={[{ id: 3, name: 'Poções' }]}
        characters={[{ id: 1, name: 'Aria' }]}
        reload={reload}
        showNotice={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Nome'), 'Feira na cidade');
    await user.clear(screen.getByLabelText('Desconto (%)'));
    await user.type(screen.getByLabelText('Desconto (%)'), '20');
    await user.selectOptions(screen.getByLabelText('Categoria'), '3');
    await user.click(screen.getByRole('button', { name: 'Criar desconto' }));
    expect(api.createDiscount).toHaveBeenCalledWith({ name: 'Feira na cidade', percent: 20, categoryId: 3, characterId: null });

    await user.click(screen.getByRole('button', { name: 'Desligar' }));
    await waitFor(() => expect(api.updateDiscount).toHaveBeenCalledWith(4, { isActive: false }));
  });
});
