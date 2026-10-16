import MoneyInput from './MoneyInput.jsx';
import { formatMoney } from '../js/money.js';
import { useEffect, useState } from 'react';
import { ImageUp, Save, X } from 'lucide-react';

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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function AdminItemForm({ api, uploadsEnabled = false, item, shops = [], categories = [], rarities = [], onSave, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // A imagem vai do celular direto para o armazenamento; o formulario so
  // recebe a URL final, como se o Mestre a tivesse colado.
  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Envie uma imagem JPG, PNG, WebP ou GIF.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      updateField('imageUrl', await api.uploadItemImage(file));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      shopId: Number(form.shopId || shops[0]?.id) || undefined,
      price: Number(form.price),
      sellPrice: form.sellPrice === '' ? null : Number(form.sellPrice),
      stock: Number(form.stock)
    };

    // Na edicao, o estoque so vai se o Mestre mexeu nele, junto com o valor que
    // ele viu: uma compra feita com o formulario aberto nao e desfeita.
    if (item) {
      if (payload.stock === item.stock) {
        delete payload.stock;
      } else {
        payload.expectedStock = item.stock;
      }
    }

    try {
      await onSave(payload);
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
      <label>Vendedor
        <select value={form.shopId || shops[0]?.id || ''} disabled={Boolean(item)} onChange={(e) => updateField('shopId', Number(e.target.value))}>
          {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
        </select>
      </label>
      {item && <small>Para outro vendedor, cadastre uma nova oferta. O inventário permanece vinculado à origem.</small>}
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
      {uploadsEnabled && (
        <div className="image-upload">
          <label className={`secondary-action file-action${uploading ? ' disabled' : ''}`}>
            <ImageUp size={17} />
            {uploading ? 'Enviando imagem...' : 'Enviar imagem do aparelho'}
            <input
              type="file"
              accept={IMAGE_TYPES.join(',')}
              onChange={uploadImage}
              disabled={uploading}
              className="visually-hidden"
            />
          </label>
          <small>JPG, PNG, WebP ou GIF de até 5 MB; a imagem é reduzida para 800 px.</small>
        </div>
      )}
      {form.imageUrl && <img className="item-image-preview" src={form.imageUrl} alt="Prévia da imagem do item" />}
      <div className="form-grid two">
        <MoneyInput label="Preço" value={form.price} onChange={(value) => updateField('price', value)} required />
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
        <MoneyInput label="Preço de venda à loja" value={form.sellPrice} onChange={(value) => updateField('sellPrice', value)} disabled={!form.isSellable} placeholder={`Padrão: ${formatMoney(Math.floor(Number(form.price || 0) / 2))}`} />
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
        <button className="primary-action" disabled={saving || uploading}>
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
