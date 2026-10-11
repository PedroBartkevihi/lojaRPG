import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ShopPage from './ShopPage.jsx';

const potion = {
  id: 6,
  name: 'Poção de Cura',
  category: 'Poções',
  description: '',
  price: 50,
  stock: 5,
  rarity: 'Comum',
  rarityRank: 1
};
const sword = { ...potion, id: 7, name: 'Espada Longa', category: 'Armas' };
const aria = { id: 2, name: 'Aria', className: 'Ladina', race: 'Elfa', level: 4, gold: 250 };

function renderShop(api) {
  return render(
    <ShopPage
      api={api}
      liveKey={0}
      isMaster={false}
      character={aria}
      characters={[aria]}
      selectedCharacterId={aria.id}
      onSelectCharacter={vi.fn()}
      onRefreshSession={vi.fn().mockResolvedValue()}
      showNotice={vi.fn()}
    />
  );
}

describe('ShopPage', () => {
  it('o filtro de categoria tem nome para leitores de tela', async () => {
    renderShop({ listItems: vi.fn().mockResolvedValue({ items: [potion, sword] }) });

    expect(await screen.findByRole('combobox', { name: 'Filtrar por categoria' })).toBeInTheDocument();
  });

  it('dois cliques seguidos em Finalizar compra fazem uma compra só', async () => {
    const user = userEvent.setup();
    let finishPurchase;
    const api = {
      listItems: vi.fn().mockResolvedValue({ items: [potion] }),
      createPurchase: vi.fn(
        () =>
          new Promise((resolve) => {
            finishPurchase = () => resolve({ message: 'Compra concluída.' });
          })
      )
    };
    renderShop(api);

    await user.click(await screen.findByRole('button', { name: /adicionar/i }));
    const checkout = screen.getByRole('button', { name: /finalizar compra/i });
    // Os dois cliques chegam antes de a tela redesenhar o botao.
    fireEvent.click(checkout);
    fireEvent.click(checkout);

    expect(api.createPurchase).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /finalizando/i })).toBeDisabled();

    await act(async () => finishPurchase());
  });
  it('uma busca antiga que responde depois não substitui o resultado da busca atual', async () => {
    const user = userEvent.setup();
    const pending = {};
    const api = {
      listItems: vi.fn(({ search } = {}) =>
        search
          ? new Promise((resolve) => {
              pending[search] = () => resolve({ items: [search === 'espada' ? sword : potion] });
            })
          : Promise.resolve({ items: [potion, sword] })
      )
    };
    renderShop(api);
    const box = await screen.findByPlaceholderText('Buscar item');

    await user.type(box, 'espada');
    await waitFor(() => expect(pending.espada).toBeDefined());
    await user.clear(box);
    await user.type(box, 'pocao');
    await waitFor(() => expect(pending.pocao).toBeDefined());

    // A resposta da busca atual chega primeiro; a antiga, por ultimo.
    await act(async () => pending.pocao());
    await act(async () => pending.espada());

    expect(screen.getByRole('heading', { name: 'Poção de Cura' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Espada Longa' })).not.toBeInTheDocument();
    expect(api.listItems.mock.calls.filter(([params]) => params?.search?.startsWith('esp'))).toHaveLength(1);
  });
});
