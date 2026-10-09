import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminPage from './AdminPage.jsx';

function createApi() {
  return {
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
  it('abre na aba do grupo e troca de aba sem recarregar os dados', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Aria Luaferro', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /grupo e ouro/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: /^itens$/i }));
    expect(screen.getByRole('heading', { name: /itens cadastrados/i })).toBeInTheDocument();
    expect(screen.getByText('Poção de Cura')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /catálogo/i }));
    const categories = screen.getByRole('heading', { name: /categorias/i }).closest('.surface-panel');
    expect(within(categories).getByText(/Poções/)).toBeInTheDocument();
  });

  it('abre direto na aba do endereço', async () => {
    renderPage('/admin?aba=historicos');

    expect(await screen.findByRole('heading', { name: /auditoria de ouro/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /históricos/i })).toHaveAttribute('aria-selected', 'true');
  });
});
