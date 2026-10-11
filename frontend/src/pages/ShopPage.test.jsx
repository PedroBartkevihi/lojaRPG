import { act, fireEvent, render, screen } from '@testing-library/react';
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
});
