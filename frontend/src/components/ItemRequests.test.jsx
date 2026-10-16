import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ItemRequestsPanel from './ItemRequestsPanel.jsx';
import RequestsTab from './admin/RequestsTab.jsx';

const aria = { id: 1, name: 'Aria Luaferro' };
const pending = {
  id: 4,
  characterId: 1,
  characterName: 'Aria Luaferro',
  userName: 'Aria',
  description: 'Um arco élfico',
  maxPrice: 30000,
  status: 'PENDENTE',
  masterNote: ''
};

describe('ItemRequestsPanel', () => {
  it('encomenda com o valor máximo em PC e mostra as respostas do personagem ativo', async () => {
    const user = userEvent.setup();
    const delivered = { ...pending, id: 3, description: 'Corda de seda', status: 'APROVADA', price: 1500, itemName: 'Corda de Seda', masterNote: 'Achei no porto.' };
    const otherCharacter = { ...pending, id: 5, characterId: 2, description: 'De outro personagem' };
    const api = {
      listItemRequests: vi.fn().mockResolvedValue({ requests: [delivered, otherCharacter] }),
      createItemRequest: vi.fn().mockResolvedValue({ request: pending })
    };
    const onRefreshSession = vi.fn().mockResolvedValue();
    render(<ItemRequestsPanel api={api} character={aria} liveKey={0} showNotice={vi.fn()} onRefreshSession={onRefreshSession} />);

    expect(await screen.findByText('Entregue: Corda de Seda por 15 PO')).toBeInTheDocument();
    expect(screen.getByText('Mestre: Achei no porto.')).toBeInTheDocument();
    expect(screen.queryByText('De outro personagem')).not.toBeInTheDocument();
    // Uma entrega muda o ouro: a sessão é recarregada.
    await waitFor(() => expect(onRefreshSession).toHaveBeenCalled());

    await user.type(screen.getByLabelText('O que Aria Luaferro procura'), 'Um arco élfico');
    await user.selectOptions(screen.getByLabelText('Moeda: Paga até'), 'PO');
    await user.type(screen.getByRole('spinbutton', { name: 'Paga até' }), '300');
    await user.click(screen.getByRole('button', { name: 'Encomendar' }));

    expect(api.createItemRequest).toHaveBeenCalledWith({ characterId: 1, description: 'Um arco élfico', maxPrice: 30000 });
  });
});

describe('ItemRequestsPanel: corridas', () => {
  it('cancela uma vez só e, se o Mestre já respondeu, mostra o status real', async () => {
    const user = userEvent.setup();
    let rejectCancel;
    const answered = { ...pending, status: 'RECUSADA', masterNote: 'Acabou o estoque.' };
    const api = {
      listItemRequests: vi.fn().mockResolvedValueOnce({ requests: [pending] }).mockResolvedValue({ requests: [answered] }),
      cancelItemRequest: vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectCancel = reject;
          })
      )
    };
    const showNotice = vi.fn();
    render(<ItemRequestsPanel api={api} character={aria} liveKey={0} showNotice={showNotice} />);

    await user.dblClick(await screen.findByRole('button', { name: 'Cancelar encomenda: Um arco élfico' }));
    expect(api.cancelItemRequest).toHaveBeenCalledTimes(1);

    await act(async () => rejectCancel(new Error('Esta encomenda já foi respondida. Atualize a lista.')));
    expect(await screen.findByText('Mestre: Acabou o estoque.')).toBeInTheDocument();
    expect(showNotice).toHaveBeenCalledWith('Esta encomenda já foi respondida. Atualize a lista.');
    expect(screen.queryByRole('button', { name: /Cancelar encomenda/ })).not.toBeInTheDocument();
  });

  it('uma atualização atrasada não apaga a encomenda recém-enviada', async () => {
    const user = userEvent.setup();
    let resolveOld;
    const api = {
      listItemRequests: vi
        .fn()
        .mockResolvedValueOnce({ requests: [] })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveOld = resolve;
            })
        )
        .mockResolvedValue({ requests: [pending] }),
      createItemRequest: vi.fn().mockResolvedValue({ request: pending })
    };
    const props = { api, character: aria, showNotice: vi.fn() };
    const { rerender } = render(<ItemRequestsPanel {...props} liveKey={0} />);
    await waitFor(() => expect(api.listItemRequests).toHaveBeenCalledTimes(1));
    // A batida automática sai antes da encomenda e demora a voltar.
    rerender(<ItemRequestsPanel {...props} liveKey={1} />);
    await waitFor(() => expect(api.listItemRequests).toHaveBeenCalledTimes(2));

    await user.type(screen.getByLabelText('O que Aria Luaferro procura'), 'Um arco élfico');
    await user.type(screen.getByRole('spinbutton', { name: 'Paga até' }), '300');
    await user.click(screen.getByRole('button', { name: 'Encomendar' }));
    expect(await screen.findByText('Um arco élfico')).toBeInTheDocument();

    await act(async () => resolveOld({ requests: [] }));
    expect(screen.getByText('Um arco élfico')).toBeInTheDocument();
  });

  it('avisa quando a lista não carrega na primeira vez', async () => {
    const api = { listItemRequests: vi.fn().mockRejectedValue(new Error('Sem conexão.')) };
    const showNotice = vi.fn();
    render(<ItemRequestsPanel api={api} character={aria} liveKey={0} showNotice={showNotice} />);

    await waitFor(() => expect(showNotice).toHaveBeenCalledWith('Não foi possível carregar as encomendas: Sem conexão.'));
  });
});

describe('RequestsTab', () => {
  const categories = [{ id: 1, name: 'Armas' }];
  const rarities = [{ id: 1, name: 'Raro' }];
  const items = [{ id: 10, name: 'Kit de Aventureiro', isActive: true, price: 3500, effectiveSellPrice: 1750 }];

  it('aprova com um item novo, cobrando o máximo por padrão', async () => {
    const user = userEvent.setup();
    const api = { approveItemRequest: vi.fn().mockResolvedValue({ message: 'Encomenda entregue a Aria Luaferro.' }) };
    const reload = vi.fn().mockResolvedValue();
    const showNotice = vi.fn();
    render(<RequestsTab api={api} requests={[pending]} items={items} categories={categories} rarities={rarities} loading={false} reload={reload} showNotice={showNotice} />);

    const form = screen.getByRole('form', { name: 'Responder: Um arco élfico' });
    await user.type(within(form).getByLabelText('Nome do item'), 'Arco Élfico');
    await user.click(within(form).getByRole('button', { name: 'Aprovar e entregar' }));

    expect(api.approveItemRequest).toHaveBeenCalledWith(4, {
      price: 30000,
      note: '',
      newItem: { name: 'Arco Élfico', category: 'Armas', rarity: 'Raro', description: 'Um arco élfico' }
    });
    await waitFor(() => expect(showNotice).toHaveBeenCalledWith('Encomenda entregue a Aria Luaferro.'));
    expect(reload).toHaveBeenCalled();
  });

  it('entrega um item do catálogo ou recusa com nota', async () => {
    const user = userEvent.setup();
    const api = {
      approveItemRequest: vi.fn().mockResolvedValue({ message: 'ok' }),
      rejectItemRequest: vi.fn().mockResolvedValue({})
    };
    render(<RequestsTab api={api} requests={[pending]} items={items} categories={categories} rarities={rarities} loading={false} reload={vi.fn().mockResolvedValue()} showNotice={vi.fn()} />);
    const form = screen.getByRole('form', { name: 'Responder: Um arco élfico' });

    await user.click(within(form).getByRole('radio', { name: 'Item do catálogo' }));
    await user.selectOptions(within(form).getByLabelText('Item'), '10');
    // O Mestre vê quanto a loja paga pelo item, para não cobrar menos que isso.
    expect(within(form).getByText('A loja compra este item por 17 PO 5 PP: cobre pelo menos isso.')).toBeInTheDocument();
    await user.click(within(form).getByRole('button', { name: 'Aprovar e entregar' }));
    expect(api.approveItemRequest).toHaveBeenCalledWith(4, { price: 30000, note: '', itemId: 10 });

    await user.type(within(form).getByLabelText('Nota para o jogador (opcional)'), 'Não há arcos élficos nesta cidade.');
    await user.click(within(form).getByRole('button', { name: 'Recusar' }));
    expect(api.rejectItemRequest).toHaveBeenCalledWith(4, { note: 'Não há arcos élficos nesta cidade.' });
  });
});
