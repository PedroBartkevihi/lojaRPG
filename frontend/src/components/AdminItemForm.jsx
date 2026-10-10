import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

const emptyForm = {
  name: '',
  category: '',
  description: '',
  price: 0,
  sellPrice: '',
  isSellable: true,
  rarity: '',
  stock: 0,
  imageUrl: '',
  stockReason: ''
};

// Um valor fora da lista aparece no select como a primeira opcao, mas seria
// enviado assim mesmo (e a API recriaria uma categoria que o Mestre removeu).
// Por isso o formulario passa a usar a primeira opcao da mesa.
function withinOptions(value, options) {
  return options.length === 0 || options.some((option) => option.name === value) ? value : options[0].name;
}

export default function AdminItemForm({ item, categories = [], rarities = [], onSave, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Preco de venda vazio segue a regra padrao (metade do preco).
    setForm(item ? { ...item, sellPrice: item.sellPrice ?? '' } : emptyForm);
    setError('');
  }, [item]);

  // As listas chegam depois de abrir o formulario e sao recarregadas pela
  // batida do painel; so troca o valor que nao existe mais nelas.
  useEffect(() => {
    setForm((current) => {
      const category = withinOptions(current.category, categories);
      const rarity = withinOptions(current.rarity, rarities);
      return category === current.category && rarity === current.rarity ? current : { ...current, category, rarity };
    });
  }, [form.category, form.rarity, categories, rarities]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onSave({
        ...form,
        price: Number(form.price),
        sellPrice: form.sellPrice === '' ? null : Number(form.sellPrice),
        stock: Number(form.stock)
      });
      setForm(emptyForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="item-form" className="surface-panel stack-form" onSubmit={handleSubmit}>
      <div className="panel-title">
        <Save size={20} />
        <h3>{item ? 'Editar item' : 'Cadastrar item'}</h3>
      </div>
      <label>
        Nome
        <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
      </label>
      <div className="form-grid two">
        <label>
          Categoria
          {categories.length > 0 ? (
            <select value={form.category} onChange={(event) => updateField('category', event.target.value)} required>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          ) : (
            <input value={form.category} onChange={(event) => updateField('category', event.target.value)} required />
          )}
        </label>
        <label>
          Raridade
          {rarities.length > 0 ? (
            <select value={form.rarity} onChange={(event) => updateField('rarity', event.target.value)} required>
              {rarities.map((rarity) => (
                <option key={rarity.id} value={rarity.name}>
                  {rarity.name}
                </option>
              ))}
            </select>
          ) : (
            <input value={form.rarity} onChange={(event) => updateField('rarity', event.target.value)} required />
          )}
        </label>
      </div>
      <label>
        Descrição
        <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} />
      </label>
      <label>
        Imagem do item
        <input
          value={form.imageUrl || ''}
          onChange={(event) => updateField('imageUrl', event.target.value)}
          placeholder="https://..."
        />
      </label>
      <div className="form-grid two">
        <label>
          Preço
          <input
            value={form.price}
            onChange={(event) => updateField('price', event.target.value)}
            type="number"
            min="0"
            required
          />
        </label>
        <label>
          Estoque
          <input
            value={form.stock}
            onChange={(event) => updateField('stock', event.target.value)}
            type="number"
            min="0"
            required
          />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Preço de venda à loja
          <input
            value={form.sellPrice}
            onChange={(event) => updateField('sellPrice', event.target.value)}
            type="number"
            min="0"
            placeholder={`Padrão: ${Math.floor(Number(form.price || 0) / 2)} (metade)`}
            disabled={!form.isSellable}
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={!form.isSellable}
            onChange={(event) => updateField('isSellable', !event.target.checked)}
          />
          A loja não compra este item
        </label>
      </div>
      {item && (
        <label>
          Motivo do ajuste de estoque
          <input
            value={form.stockReason || ''}
            onChange={(event) => updateField('stockReason', event.target.value)}
            placeholder="Reposição, correção, saque da campanha..."
          />
        </label>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="primary-action" disabled={saving}>
          <Save size={17} />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {item && (
          <button type="button" className="secondary-action" onClick={onCancel}>
            <X size={17} />
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
