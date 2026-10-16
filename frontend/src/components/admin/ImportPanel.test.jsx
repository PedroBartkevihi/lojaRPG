import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ImportPanel from './ImportPanel.jsx';

const packs = {
  attribution: 'Este conteúdo inclui material do System Reference Document 5.1 ("SRD 5.1").',
  packs: [
    {
      id: 'armas',
      name: 'Armas simples e marciais',
      description: 'As armas do livro.',
      items: [{ name: 'Adaga', category: 'Armas', rarity: 'Comum', price: 200, stock: 3, weight: 1, damage: '1d4 perfurante', armorClass: '' }]
    }
  ]
};

describe('ImportPanel', () => {
  it('importa um pacote do SRD mostrando a atribuição e a prévia', async () => {
    const user = userEvent.setup();
    const api = {
      listCatalogPacks: vi.fn().mockResolvedValue(packs),
      importItems: vi.fn().mockResolvedValue({ message: '1 item(ns) importado(s) para Geral.' })
    };
    const reload = vi.fn().mockResolvedValue();
    const showNotice = vi.fn();
    render(<ImportPanel api={api} shops={[{ id: 1, name: 'Geral', isDefault: true }]} reload={reload} showNotice={showNotice} />);

    expect(await screen.findByText(/SRD 5.1/)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Adaga' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Importar 1 item' }));

    expect(api.importItems).toHaveBeenCalledWith({ items: packs.packs[0].items });
    await waitFor(() => expect(showNotice).toHaveBeenCalledWith('1 item(ns) importado(s) para Geral.'));
  });

  it('lê a planilha no navegador e bloqueia o envio com erro de linha', async () => {
    const user = userEvent.setup();
    const api = { listCatalogPacks: vi.fn().mockResolvedValue(packs), importItems: vi.fn() };
    render(<ImportPanel api={api} shops={[]} reload={vi.fn()} showNotice={vi.fn()} />);

    await user.click(screen.getByRole('radio', { name: 'Planilha CSV' }));
    const file = new File(['nome;categoria;preco\nCorda;Equipamentos;1\nLampião;Equipamentos;caro'], 'itens.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/Escolher planilha/), file);

    expect(await screen.findByRole('alert')).toHaveTextContent('Linha 3: Preço inválido: "caro"');
    expect(screen.getByRole('button', { name: 'Importar 1 item' })).toBeDisabled();
    expect(api.importItems).not.toHaveBeenCalled();
  });
});
