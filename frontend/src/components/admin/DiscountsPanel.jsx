import { useState } from 'react';
import { BadgePercent, Plus, Trash2 } from 'lucide-react';
import { describeDiscount } from '../DiscountBanner.jsx';

const emptyForm = { name: '', percent: 10, categoryId: '', characterId: '' };

// Descontos e eventos de preco da mesa. Vale o maior desconto que se aplica a
// cada item, sem somar; na revenda, a loja paga no maximo o preco com desconto.
export default function DiscountsPanel({ api, discounts, categories = [], characters = [], reload, showNotice }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function run(action, message) {
    setBusy(true);

    try {
      await action();
      await reload();
      showNotice(message);
      return true;
    } catch (error) {
      showNotice(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(event) {
    event.preventDefault();
    const body = {
      name: form.name,
      percent: Number(form.percent),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      characterId: form.characterId ? Number(form.characterId) : null
    };

    if (await run(() => api.createDiscount(body), 'Desconto criado.')) {
      setForm(emptyForm);
    }
  }

  return (
    <div className="content-grid admin-tab discounts-panel">
      <div className="surface-panel">
        <div className="panel-title">
          <BadgePercent size={20} />
          <h3>Descontos e eventos</h3>
        </div>
        <div className="admin-list">
          {discounts.map((discount) => (
            <div className="admin-row" key={discount.id}>
              <div>
                <strong>{describeDiscount(discount)}</strong>
                <span>{discount.isActive ? 'Ativo' : 'Desligado'}</span>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="secondary-action"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => api.updateDiscount(discount.id, { isActive: !discount.isActive }),
                      discount.isActive ? 'Desconto desligado.' : 'Desconto ligado.'
                    )
                  }
                >
                  {discount.isActive ? 'Desligar' : 'Ligar'}
                </button>
                <button
                  type="button"
                  className="danger-action"
                  disabled={busy}
                  aria-label={`Remover ${discount.name}`}
                  onClick={() => run(() => api.deleteDiscount(discount.id), 'Desconto removido.')}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
          {discounts.length === 0 && <p className="empty-state">Nenhum desconto. Crie um evento da mesa ou o desconto de um personagem.</p>}
        </div>
      </div>
      <form className="surface-panel stack-form" onSubmit={create}>
        <h3>Novo desconto</h3>
        <label>
          Nome
          <input value={form.name} onChange={(event) => update('name', event.target.value)} maxLength={120} required placeholder="Feira na cidade, boa rolagem de Persuasão..." />
        </label>
        <label>
          Desconto (%)
          <input type="number" min="1" max="90" value={form.percent} onChange={(event) => update('percent', event.target.value)} required />
        </label>
        <div className="form-grid two">
          <label>
            Categoria
            <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)}>
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Personagem
            <select value={form.characterId} onChange={(event) => update('characterId', event.target.value)}>
              <option value="">Toda a mesa</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="form-hint">Se mais de um desconto valer para um item, fica o maior. O preço pago vai para o histórico da compra.</p>
        <button className="primary-action" disabled={busy}>
          <Plus size={17} />
          Criar desconto
        </button>
      </form>
    </div>
  );
}
