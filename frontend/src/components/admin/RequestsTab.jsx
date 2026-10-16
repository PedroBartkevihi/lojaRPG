import { useState } from 'react';
import { Check, ScrollText, X } from 'lucide-react';
import { formatMoney } from '../../js/money.js';
import MoneyInput from '../MoneyInput.jsx';
import { REQUEST_STATUS } from '../ItemRequestsPanel.jsx';
import { SkeletonRows } from '../Skeleton.jsx';

// Resposta a uma encomenda: entregar um item do catalogo ou um item novo,
// feito para ela, cobrando ate o valor que o jogador aceitou pagar.
function ApproveForm({ api, request, items, categories, rarities, reload, showNotice }) {
  const [source, setSource] = useState('new');
  const [itemId, setItemId] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    category: categories[0]?.name || '',
    rarity: rarities[0]?.name || '',
    description: request.description
  });
  const [price, setPrice] = useState(request.maxPrice);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  function updateNewItem(field, value) {
    setNewItem((current) => ({ ...current, [field]: value }));
  }

  async function approve(event) {
    event.preventDefault();
    setBusy('approve');

    try {
      const body = { price, note, ...(source === 'catalog' ? { itemId: Number(itemId) } : { newItem }) };
      const data = await api.approveItemRequest(request.id, body);
      await reload();
      showNotice(data.message);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setBusy('');
    }
  }

  async function reject() {
    setBusy('reject');

    try {
      await api.rejectItemRequest(request.id, { note });
      await reload();
      showNotice('Encomenda recusada.');
    } catch (error) {
      showNotice(error.message);
    } finally {
      setBusy('');
    }
  }

  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form className="stack-form compact-form" onSubmit={approve} aria-label={`Responder: ${request.description}`}>
      <div className="segmented" role="radiogroup" aria-label="Item da entrega">
        <label className="checkbox-field">
          <input type="radio" name={`source-${request.id}`} checked={source === 'new'} onChange={() => setSource('new')} />
          Item novo
        </label>
        <label className="checkbox-field">
          <input type="radio" name={`source-${request.id}`} checked={source === 'catalog'} onChange={() => setSource('catalog')} />
          Item do catálogo
        </label>
      </div>
      {source === 'catalog' ? (
        <label>
          Item
          <select value={itemId} onChange={(event) => setItemId(event.target.value)} required>
            <option value="">Escolha</option>
            {sortedItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? '' : ' (fora da loja)'}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label>
            Nome do item
            <input value={newItem.name} onChange={(event) => updateNewItem('name', event.target.value)} maxLength={140} required />
          </label>
          <div className="form-grid two">
            <label>
              Categoria
              <select value={newItem.category} onChange={(event) => updateNewItem('category', event.target.value)} required>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Raridade
              <select value={newItem.rarity} onChange={(event) => updateNewItem('rarity', event.target.value)} required>
                {rarities.map((rarity) => (
                  <option key={rarity.id} value={rarity.name}>
                    {rarity.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Descrição
            <textarea value={newItem.description} onChange={(event) => updateNewItem('description', event.target.value)} maxLength={1200} />
          </label>
          <p className="form-hint">O item novo fica no catálogo fora da loja: só quem encomendou recebe.</p>
        </>
      )}
      <MoneyInput label="Preço cobrado" value={price} onChange={setPrice} max={request.maxPrice} required />
      <label>
        Nota para o jogador (opcional)
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Chega em dois dias, feito sob medida..." />
      </label>
      <div className="form-actions">
        <button className="primary-action" disabled={Boolean(busy)}>
          <Check size={17} />
          {busy === 'approve' ? 'Entregando...' : 'Aprovar e entregar'}
        </button>
        <button type="button" className="danger-action" disabled={Boolean(busy)} onClick={reject}>
          <X size={17} />
          {busy === 'reject' ? 'Recusando...' : 'Recusar'}
        </button>
      </div>
    </form>
  );
}

export default function RequestsTab({ api, requests, items, categories, rarities, loading, reload, showNotice }) {
  const pending = requests.filter((request) => request.status === 'PENDENTE');
  const answered = requests.filter((request) => request.status !== 'PENDENTE');

  return (
    <div className="content-grid admin-tab">
      <div className="surface-panel">
        <div className="panel-title">
          <ScrollText size={20} />
          <h3>Encomendas esperando resposta</h3>
        </div>
        {loading ? (
          <SkeletonRows count={3} />
        ) : (
          <div className="admin-list request-cards">
            {pending.map((request) => (
              <article className="request-card" key={request.id}>
                <header>
                  <strong>{request.characterName}</strong>
                  <span>
                    {request.userName} - paga até {formatMoney(request.maxPrice)}
                  </span>
                </header>
                <p>{request.description}</p>
                <ApproveForm
                  api={api}
                  request={request}
                  items={items}
                  categories={categories}
                  rarities={rarities}
                  reload={reload}
                  showNotice={showNotice}
                />
              </article>
            ))}
            {pending.length === 0 && (
              <p className="empty-state">Nenhuma encomenda esperando. Os jogadores encomendam pela loja.</p>
            )}
          </div>
        )}
      </div>
      <div className="surface-panel">
        <div className="panel-title">
          <ScrollText size={20} />
          <h3>Respondidas</h3>
        </div>
        <div className="history-list">
          {answered.map((request) => (
            <article className="history-entry" key={request.id}>
              <header>
                <div>
                  <strong>
                    {request.characterName}: {request.description}
                  </strong>
                  <span>
                    {REQUEST_STATUS[request.status]}
                    {request.status === 'APROVADA' ? ` - ${request.itemName} por ${formatMoney(request.price)}` : ''}
                  </span>
                </div>
              </header>
              {request.masterNote && <p>{request.masterNote}</p>}
            </article>
          ))}
          {answered.length === 0 && <p className="empty-state">Nenhuma encomenda respondida ainda.</p>}
        </div>
      </div>
    </div>
  );
}
