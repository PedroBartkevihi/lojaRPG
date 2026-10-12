import { Coins, Gift, PackagePlus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { usePagedHistory } from '../../js/usePagedHistory.js';
import HistoryPagination from '../HistoryPagination.jsx';
import InventoryLogList from '../InventoryLogList.jsx';
import PurchaseHistory from '../PurchaseHistory.jsx';
import { SkeletonRows } from '../Skeleton.jsx';
import SessionFilter from '../SessionFilter.jsx';

export default function HistoryTab({ api, refreshKey }) {
  const [sessionId, setSessionId] = useState('');
  const loadInventory = useCallback(async (params) => {
    const data = await api.listInventoryLogs({ ...params, ...(sessionId ? { sessionId } : {}) });
    return { entries: data.logs, pagination: data.pagination };
  }, [api, sessionId]);
  const loadGold = useCallback(async (params) => {
    const data = await api.listGoldAudit({ ...params, ...(sessionId ? { sessionId } : {}) });
    return { entries: data.logs, pagination: data.pagination };
  }, [api, sessionId]);
  const loadStock = useCallback(async (params) => {
    const data = await api.listStockMovements({ ...params, ...(sessionId ? { sessionId } : {}) });
    return { entries: data.movements, pagination: data.pagination };
  }, [api, sessionId]);
  const inventory = usePagedHistory(loadInventory, refreshKey);
  const gold = usePagedHistory(loadGold, refreshKey);
  const stock = usePagedHistory(loadStock, refreshKey);
  return (
    <div className="admin-tab">
      <SessionFilter api={api} value={sessionId} onChange={setSessionId} refreshKey={refreshKey} />
      <div className="panel-grid">
      <div className="surface-panel">
        <div className="panel-title">
          <Gift size={20} />
          <h3>Vendas, usos e recompensas</h3>
        </div>
        {inventory.loading && inventory.entries.length === 0 ? <SkeletonRows count={3} /> : <InventoryLogList logs={inventory.entries} showCharacter />}
        <HistoryPagination page={inventory} label="vendas, usos e recompensas" />
      </div>

      <div className="surface-panel">
        <div className="panel-title">
          <Coins size={20} />
          <h3>Auditoria de ouro</h3>
        </div>
        <div className="history-list">
          {gold.entries.map((log) => (
            <article className="history-entry" key={log.id}>
              <header>
                <div>
                  <strong>{log.characterName}</strong>
                  <span>
                    {log.actorName} - {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <b>{log.delta > 0 ? `+${log.delta}` : log.delta} ouro</b>
              </header>
              <p>
                {log.previousGold} &rarr; {log.newGold} ouro. Motivo: {log.reason}
              </p>
            </article>
          ))}
          {gold.loading && gold.entries.length === 0 && <SkeletonRows count={3} />}
          {!gold.loading && gold.entries.length === 0 && <p className="empty-state">Nenhum ajuste de ouro registrado.</p>}
        </div>
        <HistoryPagination page={gold} label="auditoria de ouro" />
      </div>

      <div className="surface-panel">
        <div className="panel-title">
          <PackagePlus size={20} />
          <h3>Histórico de estoque</h3>
        </div>
        <div className="history-list">
          {stock.entries.map((movement) => (
            <article className="history-entry" key={movement.id}>
              <header>
                <div>
                  <strong>{movement.itemName}</strong>
                  <span>{new Date(movement.createdAt).toLocaleString()}</span>
                </div>
                <b>{movement.delta > 0 ? `+${movement.delta}` : movement.delta}</b>
              </header>
              <p>
                {movement.previousStock} &rarr; {movement.newStock}. {movement.reason}
              </p>
            </article>
          ))}
          {stock.loading && stock.entries.length === 0 && <SkeletonRows count={3} />}
          {!stock.loading && stock.entries.length === 0 && <p className="empty-state">Nenhuma movimentação registrada.</p>}
        </div>
        <HistoryPagination page={stock} label="estoque" />
      </div>

      <PurchaseHistory api={api} isMaster refreshKey={refreshKey} embedded sessionId={sessionId} />
      </div>
    </div>
  );
}
