import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

const emptyForm = {
  name: '',
  category: 'Armas',
  description: '',
  price: 0,
  sellPrice: '',
  isSellable: true,
  rarity: 'Comum',
  stock: 0,
  imageUrl: '',
  stockReason: ''
};

export default function AdminItemForm({ item, categories = [], rarities = [], onSave, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Preco de venda vazio segue a regra padrao (metade do preco).
    setForm(item ? { ...item, sellPrice: item.sellPrice ?? '' } : emptyForm);
    setError('');
  }, [item]);

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
    <form className="surface-panel stack-form" onSubmit={handleSubmit}>
      <div className="panel-title">
        <Save size={20} />
        <h3>{item ? 'Editar item' : 'Cadastrar item'}</h3>
      </div>
      <div className="form-grid two">
        <label>
          Nome
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
        </label>
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
      </div>
      <label>
        Descricao
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
      <div className="form-grid three">
        <label>
          Preco
          <input
            value={form.price}
            onChange={(event) => updateField('price', event.target.value)}
            type="number"
            min="0"
            required
          />
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
          Preco de venda a loja
          <input
            value={form.sellPrice}
            onChange={(event) => updateField('sellPrice', event.target.value)}
            type="number"
            min="0"
            placeholder={`Padrao: ${Math.floor(Number(form.price || 0) / 2)} (metade)`}
            disabled={!form.isSellable}
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={!form.isSellable}
            onChange={(event) => updateField('isSellable', !event.target.checked)}
          />
          A loja nao compra este item
        </label>
      </div>
      {item && (
        <label>
          Motivo do ajuste de estoque
          <input
            value={form.stockReason || ''}
            onChange={(event) => updateField('stockReason', event.target.value)}
            placeholder="Reposicao, correcao, saque da campanha..."
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
