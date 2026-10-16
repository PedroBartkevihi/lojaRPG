import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [cancelling, setCancelling] = useState(null);
  // Trava sincrona: um clique duplo nao manda o pedido (ou o cancelamento)
  // duas vezes antes de o botao ficar desativado.
  const actionLock = useRef(false);
  const latestLoad = useRef(0);
  const loaded = useRef(false);

  // So a resposta mais recente vale: uma batida atrasada nao traz de volta a
  // lista de antes de encomendar ou cancelar.
  const load = useCallback(async () => {
    const loadId = latestLoad.current + 1;
    latestLoad.current = loadId;
    const data = await api.listItemRequests();

    if (loadId === latestLoad.current) {
      setRequests(data.requests);
      loaded.current = true;
    }
  }, [api]);

  useEffect(() => {
    load().catch((error) => {
      // Sem lista nenhuma, o jogador fica sabendo; numa batida seguinte a
      // falha passa quieta e a proxima tenta de novo.
      if (!loaded.current) {
        showNotice(`Não foi possível carregar as encomendas: ${error.message}`);
      }
    });
  }, [load, liveKey, showNotice]);

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

    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
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
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function cancel(request) {
    if (actionLock.current) {
      return;
    }

    actionLock.current = true;
    setCancelling(request.id);

    try {
      await api.cancelItemRequest(request.id);
      await load();
      showNotice('Encomenda cancelada.');
    } catch (error) {
      showNotice(error.message);
      // O Mestre pode ter respondido antes: a lista mostra o status real.
      load().catch(() => {});
    } finally {
      actionLock.current = false;
      setCancelling(null);
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
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => cancel(request)}
                  disabled={cancelling !== null}
                  title="Cancelar encomenda" aria-label={`Cancelar encomenda: ${request.description}`}
                >
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
