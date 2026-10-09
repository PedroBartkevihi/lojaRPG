import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RewardsPanel from './RewardsPanel.jsx';

const characters = [
  { id: 1, name: 'Aria Luaferro' },
  { id: 2, name: 'Borin Escudoforte' },
  { id: 3, name: 'Lia Brasa' }
];

const items = [
  { id: 6, name: 'Pocao de Cura', isActive: true },
  { id: 9, name: 'Anel de Protecao Menor', isActive: false }
];

function renderPanel(api) {
  const handlers = { showNotice: vi.fn(), onDone: vi.fn().mockResolvedValue() };
  render(<RewardsPanel api={api} characters={characters} items={items} {...handlers} />);
  return handlers;
}

describe('RewardsPanel', () => {
  it('mostra a divisao com a sobra e entrega o ouro aos personagens marcados', async () => {
    const user = userEvent.setup();
    const api = { giveGold: vi.fn().mockResolvedValue({ message: '50 de ouro para cada um dos 2 personagens.' }) };
    const { showNotice, onDone } = renderPanel(api);

    await user.type(screen.getByLabelText(/^ouro$/i), '100');
    expect(screen.getByText('Cada personagem recebe 33 de ouro; sobra 1.')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Lia Brasa'));
    expect(screen.getByText('Cada personagem recebe 50 de ouro.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^motivo$/i), 'Tesouro do covil');
    await user.click(screen.getByRole('button', { name: /dar ouro/i }));

    expect(api.giveGold).toHaveBeenCalledWith({
      characterIds: [1, 2],
      total: 100,
      mode: 'split',
      reason: 'Tesouro do covil'
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(showNotice).toHaveBeenCalledWith('50 de ouro para cada um dos 2 personagens.');
  });

  it('entrega item fora da loja a um personagem', async () => {
    const user = userEvent.setup();
    const api = { giveItem: vi.fn().mockResolvedValue({ message: 'Lia Brasa recebeu 1x Anel de Protecao Menor.' }) };
    renderPanel(api);

    expect(screen.getByRole('option', { name: 'Anel de Protecao Menor (fora da loja)' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^personagem$/i), '3');
    await user.selectOptions(screen.getByLabelText(/^item$/i), '9');
    await user.click(screen.getByRole('button', { name: /dar item/i }));

    expect(api.giveItem).toHaveBeenCalledWith({ characterId: 3, itemId: 9, quantity: 1, reason: '' });
  });
});
