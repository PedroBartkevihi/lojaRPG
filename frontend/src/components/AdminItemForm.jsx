import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

const emptyForm = {
  name: '',
  category: 'Armas',
  description: '',
  price: 0,
  rarity: 'Comum',
  stock: 0
};

export default function AdminItemForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(item || emptyForm);
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
          <input value={form.category} onChange={(event) => updateField('category', event.target.value)} required />
        </label>
      </div>
      <label>
        Descricao
        <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} />
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
          <input value={form.rarity} onChange={(event) => updateField('rarity', event.target.value)} required />
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
