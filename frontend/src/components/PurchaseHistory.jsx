import { useCallback, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import NoCharacterNotice from './NoCharacterNotice.jsx';
import { SkeletonRows } from './Skeleton.jsx';
import { usePagedHistory } from '../js/usePagedHistory.js';
import HistoryPagination from './HistoryPagination.jsx';
import SessionFilter from './SessionFilter.jsx';

export default function PurchaseHistory({ api, isMaster, character, needsCharacter = false, refreshKey, embedded = false, sessionId }) {
  const [selectedSession, setSelectedSession] = useState('');
  const filter = embedded ? sessionId : selectedSession;
  const loadPage = useCallback(async (params) => {
    const query = { ...params, ...(filter ? { sessionId: filter } : {}) };
    const data = isMaster ? await api.listPurchases(query) : await api.myPurchases({ ...query, characterId: character?.id });
    return { entries: data.purchases, pagination: data.pagination };
  }, [api, isMaster, character?.id, filter]);
  const page = usePagedHistory(loadPage, refreshKey, !needsCharacter);
  const purchases = page.entries;

  const content = needsCharacter ? (
    <NoCharacterNotice />
  ) : (
    <div className="surface-panel">
      <div className="panel-title">
        <ReceiptText size={20} />
        <h3>Histórico de compras</h3>
      </div>
      {!embedded && <SessionFilter api={api} value={filter} onChange={setSelectedSession} refreshKey={refreshKey} />}
      {page.loading && purchases.length === 0 ? (
        <SkeletonRows count={3} />
      ) : (
        <div className="history-list">
          {purchases.map((purchase) => (
            <article className="history-entry" key={purchase.id}>
              <header>
                <div>
                  <strong>{isMaster ? purchase.characterName : `Compra #${purchase.id}`}</strong>
                  <span>{new Date(purchase.purchasedAt).toLocaleString()}</span>
                </div>
                <b>{purchase.totalValue} ouro</b>
              </header>
              <ul>
                {purchase.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}x {item.itemName} ({item.unitPrice} ouro)
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {purchases.length === 0 && <p className="empty-state">Nenhuma compra registrada.</p>}
        </div>
      )}
      <HistoryPagination page={page} label="compras" />
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="wide-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Registro da campanha</p>
          <h2>Compras realizadas</h2>
        </div>
      </div>
      {content}
    </section>
  );
}
