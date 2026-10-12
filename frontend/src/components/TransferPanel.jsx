import { useCallback, useEffect, useRef, useState } from 'react';
import { usePagedHistory } from '../js/usePagedHistory.js';
import HistoryPagination from './HistoryPagination.jsx';

export default function TransferPanel({ api, character, inventory, refreshKey, onRefresh, showNotice, sessionId }) {
  const [recipients, setRecipients] = useState([]);
  const [target, setTarget] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [gold, setGold] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const intent = useRef(null);
  useEffect(() => {
    let current = true;
    api.getCampaign().then(({ members }) => {
      if (current) setRecipients(members.flatMap((member) => member.characters).filter((entry) => entry.id !== character.id));
    }).catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [api, character.id, refreshKey]);
  const loadGold = useCallback(async (params) => {
    const data = await api.characterGoldLogs(character.id, { ...params, ...(sessionId ? { sessionId } : {}) });
    return { entries: data.logs, pagination: data.pagination };
  }, [api, character.id, sessionId]);
  const history = usePagedHistory(loadGold, refreshKey);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const recipient = recipients.find((entry) => entry.id === Number(target));
    if (!recipient) { setError('Escolha um destinatário da mesa.'); return; }
    const entry = inventory.find((row) => row.itemId === Number(itemId));
    if (!window.confirm(`Entregar ${itemId ? `${quantity}x ${entry?.item.name} e ` : ''}${Number(gold)} ouro para ${recipient.name}?`)) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const body = { targetCharacterId: Number(target), gold: Number(gold), reason,
        ...(itemId ? { itemId: Number(itemId), quantity: Number(quantity) } : {}) };
      const fingerprint = JSON.stringify(body);
      if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
      const data = await api.transfer(character.id, { ...body, idempotencyKey: intent.current.key });
      intent.current = null;
      setItemId(''); setGold(''); setReason('');
      showNotice(data.message);
      await onRefresh();
      await history.refresh();
    } catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="surface-panel">
    <h3>Entregar a outro personagem</h3>
    <form onSubmit={submit} className="form-grid">
      <label>Destinatário<select required value={target} onChange={(e) => setTarget(e.target.value)} disabled={busy}>
        <option value="">Escolha um personagem</option>
        {recipients.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </select></label>
      <label>Item para entregar<select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={busy}>
        <option value="">Somente ouro</option>
        {inventory.map((entry) => <option key={entry.itemId} value={entry.itemId}>{entry.item.name} ({entry.quantity}x)</option>)}
      </select></label>
      {itemId && <label>Quantidade a entregar<input type="number" min="1" required value={quantity} disabled={busy} onChange={(e) => setQuantity(e.target.value)} /></label>}
      <label>Ouro a entregar<input type="number" min="0" max={character.gold} value={gold} disabled={busy} onChange={(e) => setGold(e.target.value)} placeholder="0" /></label>
      <label>Motivo da entrega<input maxLength={300} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} /></label>
      <button className="primary-action" disabled={busy || !target || (!itemId && Number(gold) <= 0)}>{busy ? 'Entregando...' : 'Confirmar entrega'}</button>
    </form>
    {error && <p role="alert" className="form-error">{error}</p>}
    <h3>Movimentações de ouro</h3>
    <div className="history-list">{history.entries.map((log) => <article key={log.id} className="history-entry">
      <strong>{log.delta > 0 ? '+' : ''}{log.delta} ouro</strong><p>{log.reason}</p><small>{new Date(log.createdAt).toLocaleString()}</small>
    </article>)}</div>
    <HistoryPagination page={history} label="movimentações de ouro" />
  </div>;
}
