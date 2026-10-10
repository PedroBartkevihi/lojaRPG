import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CatalogTab from './CatalogTab.jsx';

const rarities = [
  { id: 1, name: 'Comum', rank: 1 },
  { id: 2, name: 'Incomum', rank: 2 },
  { id: 3, name: 'Raro', rank: 3 }
];

describe('CatalogTab', () => {
  it('cria a raridade com a cor escolhida, não pela ordem de criação', async () => {
    const user = userEvent.setup();
    const api = { createRarity: vi.fn().mockResolvedValue({ message: 'Raridade criada.' }) };

    render(
      <CatalogTab api={api} categories={[]} rarities={rarities} loading={false} reload={vi.fn()} showNotice={vi.fn()} />
    );

    await user.type(screen.getByLabelText('Nova raridade'), 'Lendário');
    await user.selectOptions(screen.getByLabelText('Cor da nova raridade'), '5');
    await user.click(screen.getAllByRole('button', { name: 'Adicionar' })[1]);

    expect(api.createRarity).toHaveBeenCalledWith({ name: 'Lendário', rank: 5 });
  });
});
