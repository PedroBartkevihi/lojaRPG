import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminPage from './AdminPage.jsx';

function createApi() {
  return {
    listSessions: vi.fn().mockResolvedValue({ sessions: [] }),
    listShops: vi.fn().mockResolvedValue({ shops: [{ id: 1, name: 'Geral', isOpen: true }] }),
    listItems: vi.fn().mockResolvedValue({
      items: [
        { id: 6, name: 'Poção de Cura', category: 'Poções', rarity: 'Comum', price: 50, stock: 12, isActive: true, isSellable: true, effectiveSellPrice: 25 }
      ]
    }),
    listCharacters: vi.fn().mockResolvedValue({
      characters: [{ id: 1, name: 'Aria Luaferro', userName: 'Aria', className: 'Ladino', level: 4, gold: 250 }]
    }),
    listGoldAudit: vi.fn().mockResolvedValue({ logs: [] }),
    listCategories: vi.fn().mockResolvedValue({ categories: [{ id: 3, name: 'Poções', itemCount: 1 }] }),
    listRarities: vi.fn().mockResolvedValue({ rarities: [{ id: 1, name: 'Comum', rank: 1, itemCount: 1 }] }),
    listStockMovements: vi.fn().mockResolvedValue({ movements: [] }),
    listInventoryLogs: vi.fn().mockResolvedValue({ logs: [] }),
    listPurchases: vi.fn().mockResolvedValue({ purchases: [] })
  };
}

function renderPage(path = '/admin') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AdminPage api={createApi()} liveKey={0} showNotice={vi.fn()} onRefresh={vi.fn()} />
    </MemoryRouter>
  );
}

describe('AdminPage', () => {
  it('consulta so a aba visivel e nao duplica a carga inicial com liveKey preenchido', async () => {
    const user = userEvent.setup();
    const api = createApi();
    const showNotice = vi.fn();
    const page = (liveKey) => <MemoryRouter><AdminPage api={api} liveKey={liveKey} showNotice={showNotice} /></MemoryRouter>;
    const { rerender } = render(page(10));
    await screen.findByText('Aria Luaferro', { selector: 'strong' });
    expect(api.listItems).toHaveBeenCalledTimes(1);
    expect(api.listCharacters).toHaveBeenCalledTimes(1);
    expect(api.listGoldAudit).not.toHaveBeenCalled();
    expect(api.listCategories).not.toHaveBeenCalled();
    rerender(page(11));
    await waitFor(() => expect(api.listCharacters).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('tab', { name: /históricos/i }));
    await waitFor(() => expect(api.listPurchases).toHaveBeenCalledTimes(1));
    expect(api.listGoldAudit).toHaveBeenCalledTimes(1);
    expect(api.listInventoryLogs).toHaveBeenCalledTimes(1);
    expect(api.listStockMovements).toHaveBeenCalledTimes(1);
    expect(api.listItems).toHaveBeenCalledTimes(2);
    rerender(page(12));
    await waitFor(() => expect(api.listGoldAudit).toHaveBeenCalledTimes(2));
    expect(api.listItems).toHaveBeenCalledTimes(2);
    expect(api.listCharacters).toHaveBeenCalledTimes(2);
    expect(api.listCategories).not.toHaveBeenCalled();
  });

  it('abre na aba do grupo e carrega os dados da aba escolhida', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Aria Luaferro', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /grupo e moedas/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: /^itens$/i }));
    expect(screen.getByRole('heading', { name: /itens cadastrados/i })).toBeInTheDocument();
    expect(await screen.findByText('Poção de Cura')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /catálogo/i }));
    const categories = screen.getByRole('heading', { name: /categorias/i }).closest('.surface-panel');
    expect(await within(categories).findByText(/Poções/)).toBeInTheDocument();
  });

  it('abre direto na aba do endereço', async () => {
    renderPage('/admin?aba=historicos');

    expect(await screen.findByRole('heading', { name: /auditoria de moedas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /históricos/i })).toHaveAttribute('aria-selected', 'true');
  });
});
