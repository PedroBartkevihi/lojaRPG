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

  it('recusa peso que não é número em vez de salvar o item sem peso', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    render(<AdminItemForm categories={categories} rarities={rarities} onSave={onSave} />);

    await fillRequired(user);
    await user.type(screen.getByLabelText('Peso (lb)'), '3 lb');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Peso inválido: use um número em libras, como 3 ou 2,5.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Peso (lb)'));
    await user.type(screen.getByLabelText('Peso (lb)'), '2,5');
    await user.click(screen.getByRole('button', { name: /salvar/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ weight: 2.5 }));
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

  describe('editando um item', () => {
    const potion = {
      id: 6,
      name: 'Poção de Cura',
      category: 'Poções',
      description: '',
      price: 50,
      sellPrice: null,
      isSellable: true,
      rarity: 'Incomum',
      stock: 5,
      imageUrl: ''
    };

    it('não manda o estoque quando o Mestre só muda o nome', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue();
      render(<AdminItemForm item={potion} categories={categories} rarities={rarities} onSave={onSave} />);

      await user.clear(screen.getByLabelText('Nome'));
      await user.type(screen.getByLabelText('Nome'), 'Poção de Cura Maior');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      const payload = onSave.mock.calls[0][0];
      expect(payload.name).toBe('Poção de Cura Maior');
      expect(payload).not.toHaveProperty('stock');
      expect(payload).not.toHaveProperty('expectedStock');
    });

    it('manda o estoque novo com o valor visto ao abrir', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue();
      render(<AdminItemForm item={potion} categories={categories} rarities={rarities} onSave={onSave} />);

      await user.clear(screen.getByLabelText('Estoque'));
      await user.type(screen.getByLabelText('Estoque'), '12');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ stock: 12, expectedStock: 5 }));
    });
  });

  it('envia a imagem do aparelho e guarda a URL devolvida', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    const api = { uploadItemImage: vi.fn().mockResolvedValue('https://res.cloudinary.com/demo/image/upload/escudo.webp') };
    render(<AdminItemForm api={api} uploadsEnabled categories={categories} rarities={rarities} onSave={onSave} />);

    const file = new File(['imagem'], 'escudo.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/Enviar imagem do aparelho/), file);

    expect(api.uploadItemImage).toHaveBeenCalledWith(file);
    expect(await screen.findByAltText('Prévia da imagem do item')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/image/upload/escudo.webp'
    );
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/escudo.webp' }));
  });

  it('recusa arquivo que não é imagem e esconde o envio sem armazenamento configurado', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const api = { uploadItemImage: vi.fn() };
    const { rerender } = render(<AdminItemForm api={api} uploadsEnabled categories={categories} rarities={rarities} onSave={vi.fn()} />);

    await user.upload(screen.getByLabelText(/Enviar imagem do aparelho/), new File(['%PDF'], 'ficha.pdf', { type: 'application/pdf' }));
    expect(screen.getByText('Envie uma imagem JPG, PNG, WebP ou GIF.')).toBeInTheDocument();
    expect(api.uploadItemImage).not.toHaveBeenCalled();

    rerender(<AdminItemForm api={api} categories={categories} rarities={rarities} onSave={vi.fn()} />);
    expect(screen.queryByLabelText(/Enviar imagem do aparelho/)).not.toBeInTheDocument();
  });
});
