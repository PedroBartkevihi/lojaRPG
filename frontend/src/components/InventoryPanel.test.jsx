import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InventoryPanel from './InventoryPanel.jsx';

const character = { id: 2, name: 'Borin Escudoforte', gold: 320 };

function inventoryResponse() {
  return {
    character,
    inventory: [
      {
        id: 1,
        itemId: 6,
        quantity: 3,
        item: { id: 6, name: 'Pocao de Cura', category: 'Pocoes', description: '', effectiveSellPrice: 25 }
      },
      {
        id: 2,
        itemId: 11,
        quantity: 1,
        item: { id: 11, name: 'Chave do Templo', category: 'Magicos', description: '', effectiveSellPrice: null }
      }
    ],
    logs: [
      { id: 1, type: 'RECOMPENSA', quantity: 1, itemName: 'Chave do Templo', actorName: 'Mestre do Cofre', createdAt: '2026-10-09T12:00:00Z', reason: 'Bau do templo' }
    ]
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InventoryPanel', () => {
  it('vende a quantidade escolhida pelo preco da loja e atualiza a sessao', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const api = {
      myInventory: vi.fn().mockResolvedValue(inventoryResponse()),
      sellItem: vi.fn().mockResolvedValue({ message: 'Venda concluida: 2x Pocao de Cura por 50 ouro.' })
    };
    const onRefreshSession = vi.fn().mockResolvedValue();
    const showNotice = vi.fn();

    render(
      <InventoryPanel api={api} character={character} showNotice={showNotice} onRefreshSession={onRefreshSession} />
    );

    expect(await screen.findByText('A loja paga 25 ouro cada')).toBeInTheDocument();
    expect(screen.getByText('A loja nao compra este item')).toBeInTheDocument();
    expect(screen.getByText('Recebeu 1x Chave do Templo de Mestre do Cofre')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /vender/i })).toHaveLength(1);

    await user.type(screen.getByLabelText('Quantidade de Pocao de Cura'), '2');
    await user.click(screen.getByRole('button', { name: /vender/i }));

    expect(window.confirm).toHaveBeenCalledWith('Vender 2x Pocao de Cura por 50 ouro?');
    expect(api.sellItem).toHaveBeenCalledWith(2, { itemId: 6, quantity: 2 });
    expect(showNotice).toHaveBeenCalledWith('Venda concluida: 2x Pocao de Cura por 50 ouro.');
    expect(onRefreshSession).toHaveBeenCalledTimes(1);
  });

  it('nao usa o item quando o jogador cancela a confirmacao', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const api = { myInventory: vi.fn().mockResolvedValue(inventoryResponse()), useItem: vi.fn() };

    render(<InventoryPanel api={api} character={character} />);

    await user.click((await screen.findAllByRole('button', { name: /usar/i }))[1]);

    expect(window.confirm).toHaveBeenCalledWith('Usar 1x Chave do Templo? O item sai do inventario.');
    expect(api.useItem).not.toHaveBeenCalled();
  });
});
