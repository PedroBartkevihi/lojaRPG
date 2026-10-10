import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminItemForm from './AdminItemForm.jsx';

// A mesa do teste nao tem a categoria "Armas" (o Mestre removeu).
const categories = [
  { id: 2, name: 'Armaduras' },
  { id: 3, name: 'Poções' }
];
const rarities = [
  { id: 5, name: 'Incomum' },
  { id: 6, name: 'Raro' }
];

async function fillRequired(user) {
  await user.type(screen.getByLabelText('Nome'), 'Escudo de Carvalho');
  await user.clear(screen.getByLabelText('Preço'));
  await user.type(screen.getByLabelText('Preço'), '40');
}

describe('AdminItemForm', () => {
  it('salva o item novo com a categoria e a raridade mostradas na tela', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();

    render(<AdminItemForm categories={categories} rarities={rarities} onSave={onSave} />);

    expect(screen.getByLabelText('Categoria')).toHaveValue('Armaduras');
    expect(screen.getByLabelText('Raridade')).toHaveValue('Incomum');

    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Armaduras', rarity: 'Incomum' }));
  });

  it('usa a primeira categoria quando a lista chega depois de abrir o formulário', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    const { rerender } = render(<AdminItemForm categories={[]} rarities={[]} onSave={onSave} />);

    rerender(<AdminItemForm categories={categories} rarities={rarities} onSave={onSave} />);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Armaduras', rarity: 'Incomum' }));
  });

  it('mantém a escolha do Mestre quando as listas são recarregadas', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    const { rerender } = render(<AdminItemForm categories={categories} rarities={rarities} onSave={onSave} />);

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Poções');
    // A batida de 10 s do painel recarrega as listas com objetos novos.
    rerender(<AdminItemForm categories={[...categories]} rarities={[...rarities]} onSave={onSave} />);

    expect(screen.getByLabelText('Categoria')).toHaveValue('Poções');
  });
});
