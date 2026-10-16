import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MasterGuide, { markCatalogReviewed } from './MasterGuide.jsx';

const createdAt = '2026-10-16T10:00:00.000Z';
const starterItem = { id: 1, isActive: true, createdAt, updatedAt: createdAt };
const newCampaign = { id: 7, name: 'Mesa da Costa', memberCount: 1, isDemo: false, createdAt };

function steps() {
  return within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent);
}

describe('MasterGuide', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mostra os quatro passos de uma mesa nova, todos pendentes', () => {
    render(<MasterGuide campaign={newCampaign} items={[starterItem]} characters={[]} onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Primeiros passos da mesa' })).toBeInTheDocument();
    expect(screen.getByText('0 de 4')).toBeInTheDocument();
    expect(steps().every((text) => text.includes('(pendente)'))).toBe(true);
  });

  it('marca os passos a partir de membros, personagens e ouro, e leva às abas certas', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const campaign = { ...newCampaign, memberCount: 3 };
    const characters = [{ id: 1, userId: 2, gold: 0 }];
    render(<MasterGuide campaign={campaign} items={[starterItem]} characters={characters} onNavigate={onNavigate} />);

    const [catalog, invite, waiting, gold] = steps();
    expect(catalog).toContain('(pendente)');
    expect(invite).toContain('(feito)');
    expect(waiting).toContain('1 de 2 jogadores criaram personagem');
    expect(gold).toContain('(pendente)');

    await user.click(screen.getByRole('button', { name: 'Abrir itens' }));
    expect(onNavigate).toHaveBeenCalledWith('itens');
  });

  it('some com tudo feito e não volta se o ouro for gasto depois', () => {
    markCatalogReviewed(newCampaign.id);
    const campaign = { ...newCampaign, memberCount: 2 };
    const { rerender } = render(
      <MasterGuide campaign={campaign} items={[starterItem]} characters={[{ id: 1, userId: 2, gold: 5000 }]} onNavigate={vi.fn()} />
    );
    expect(screen.queryByRole('heading', { name: 'Primeiros passos da mesa' })).not.toBeInTheDocument();

    rerender(<MasterGuide campaign={campaign} items={[starterItem]} characters={[{ id: 1, userId: 2, gold: 0 }]} onNavigate={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: 'Primeiros passos da mesa' })).not.toBeInTheDocument();
  });

  it('pode ser dispensado e não aparece na mesa de demonstração', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MasterGuide campaign={newCampaign} items={[starterItem]} characters={[]} onNavigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Dispensar o guia' }));
    expect(screen.queryByRole('heading', { name: 'Primeiros passos da mesa' })).not.toBeInTheDocument();

    rerender(<MasterGuide campaign={{ ...newCampaign, id: 1, isDemo: true }} items={[starterItem]} characters={[]} onNavigate={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: 'Primeiros passos da mesa' })).not.toBeInTheDocument();
  });
});
