import { formatMoney } from '../js/money.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePagedHistory } from '../js/usePagedHistory.js';
import HistoryPagination from '../components/HistoryPagination.jsx';

export default function SessionDiary({ api, isMaster, liveKey, showNotice }) {
  const [active, setActive] = useState(null);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const load = useCallback(async (params) => {
    const data = await api.listSessions(params);
    setActive(data.active);
    return { entries: data.sessions, pagination: data.pagination };
  }, [api]);
  const page = usePagedHistory(load, liveKey);
  useEffect(() => {
    let current = true;
    setDetails(null);
    if (selected) api.sessionSummary(selected).then((data) => { if (current) { setDetails(data); setError(''); } })
      .catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [api, selected, liveKey]);
  async function changeSession() {
    if (pending.current) return;
    if (active && !window.confirm(`Encerrar a sessão ${active.number}?`)) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const data = active ? await api.closeSession(active.id, notes ? { notes } : {}) : await api.startSession({ notes });
      setNotes('');
      setSelected(data.session.id);
      setDetails(await api.sessionSummary(data.session.id));
      await page.refresh();
      showNotice(active ? 'Sessão encerrada.' : 'Sessão iniciada.');
    } catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="wide-section">
    <div className="section-heading"><div><p className="eyebrow">Registro da campanha</p><h2>Diário da sessão</h2></div></div>
    <div className="surface-panel">
      <p role="status">{active ? `Sessão ${active.number} em andamento` : 'Nenhuma sessão aberta'}</p>
      {isMaster && <><label>Notas da sessão<textarea maxLength={3000} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={busy} placeholder={active?.notes || 'Acontecimentos e lembretes para o grupo'} /></label>
        <button className="primary-action" disabled={busy || page.loading} onClick={changeSession}>{busy ? 'Salvando...' : active ? 'Encerrar sessão' : 'Iniciar sessão'}</button></>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="panel-grid">
      <div className="surface-panel"><h3>Sessões da mesa</h3>
        {page.entries.map((session) => <article className="history-entry" key={session.id}>
          <button className="secondary-action" aria-pressed={selected === session.id} onClick={() => setSelected(session.id)}>Ver sessão {session.number}</button>
          <p>{new Date(session.startedAt).toLocaleString()} - {session.endedAt ? 'Encerrada' : 'Aberta'}</p>
        </article>)}
        {!page.loading && !page.entries.length && <p>Nenhuma sessão registrada.</p>}
        <HistoryPagination page={page} label="sessões" />
      </div>
      <div className="surface-panel"><h3>Resumo{details ? ` da sessão ${details.session.number}` : ''}</h3>
        {details ? <><p className="session-notes">{details.session.notes || 'Sem notas.'}</p>
          <p>{details.summary.purchaseCount} compras; o grupo gastou {formatMoney(details.summary.spent)}.</p>
          <p>Variação líquida nos ajustes de saldo: {formatMoney(details.summary.goldChange)}.</p>
          <ul>{details.summary.movements.map((entry, index) => <li key={index}>{entry.characterName}: {entry.type.toLowerCase()} de {entry.quantity}x {entry.itemName}{entry.type === 'VENDA' ? ` por ${formatMoney(entry.value)}` : ''}</li>)}</ul>
        </> : <p>Escolha uma sessão para consultar compras, usos, vendas e recompensas.</p>}
      </div>
    </div>
  </section>;
}
