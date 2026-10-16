import { useCallback, useEffect, useState } from 'react';
import { ScrollText, Send, X } from 'lucide-react';
import { formatMoney } from '../js/money.js';
import MoneyInput from './MoneyInput.jsx';

export const REQUEST_STATUS = {
  PENDENTE: 'Esperando o Mestre',
  APROVADA: 'Entregue',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada'
};

// Encomendas do personagem ativo: o jogador pede um item que nao esta no
// catalogo, dizendo quanto paga no maximo, e acompanha a resposta do Mestre.
export default function ItemRequestsPanel({ api, character, liveKey, showNotice, onRefreshSession }) {
  const [requests, setRequests] = useState([]);
  const [description, setDescription] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api.listItemRequests();
    setRequests(data.requests || []);
  }, [api]);

  useEffect(() => {
    load().catch(() => {});
  }, [load, liveKey]);

  const mine = requests.filter((request) => request.characterId === character.id);
  const delivered = mine.filter((request) => request.status === 'APROVADA').map((request) => request.id).join(',');

  // Uma encomenda entregue muda o ouro e o inventario do personagem.
  useEffect(() => {
    if (delivered) {
      onRefreshSession?.().catch(() => {});
    }
  }, [delivered, onRefreshSession]);

  async function submit(event) {
    event.preventDefault();

    if (!Number.isSafeInteger(maxPrice)) {
      showNotice('Informe quanto o personagem paga no máximo.');
      return;
    }

    setBusy(true);

    try {
      await api.createItemRequest({ characterId: character.id, description, maxPrice });
      setDescription('');
      setMaxPrice('');
      await load();
      showNotice('Encomenda enviada ao Mestre.');
    } catch (error) {
      showNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(request) {
    try {
      await api.cancelItemRequest(request.id);
      await load();
      showNotice('Encomenda cancelada.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  return (
    <div className="surface-panel item-requests">
      <div className="panel-title">
        <ScrollText size={20} />
        <h3>Encomendas ao Mestre</h3>
      </div>
      <form className="stack-form compact-form" onSubmit={submit}>
        <label>
          O que {character.name} procura
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            placeholder="Um arco élfico, uma poção de respirar na água..."
            required
          />
        </label>
        <MoneyInput label="Paga até" value={maxPrice} onChange={setMaxPrice} required />
        <button className="secondary-action" disabled={busy}>
          <Send size={17} />
          {busy ? 'Enviando...' : 'Encomendar'}
        </button>
      </form>
      {mine.length > 0 && (
        <ul className="request-list">
          {mine.map((request) => (
            <li key={request.id} data-status={request.status}>
              <div>
                <strong>{request.description}</strong>
                <span>
                  {REQUEST_STATUS[request.status]}
                  {request.status === 'APROVADA'
                    ? `: ${request.itemName} por ${formatMoney(request.price)}`
                    : ` (até ${formatMoney(request.maxPrice)})`}
                </span>
                {request.masterNote && <small>Mestre: {request.masterNote}</small>}
              </div>
              {request.status === 'PENDENTE' && (
                <button type="button" className="icon-button" onClick={() => cancel(request)} title="Cancelar encomenda" aria-label={`Cancelar encomenda: ${request.description}`}>
                  <X size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
