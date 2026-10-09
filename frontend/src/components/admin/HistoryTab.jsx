import { Coins, Gift, PackagePlus } from 'lucide-react';
import InventoryLogList from '../InventoryLogList.jsx';
import PurchaseHistory from '../PurchaseHistory.jsx';

export default function HistoryTab({ api, stockMovements, inventoryLogs, goldAuditLogs, purchasesKey }) {
  return (
    <div className="panel-grid admin-tab">
      <div className="surface-panel">
        <div className="panel-title">
          <Gift size={20} />
          <h3>Vendas, usos e recompensas</h3>
        </div>
        <InventoryLogList logs={inventoryLogs} showCharacter limit={15} />
      </div>

      <div className="surface-panel">
        <div className="panel-title">
          <Coins size={20} />
          <h3>Auditoria de ouro</h3>
        </div>
        <div className="history-list">
          {goldAuditLogs.map((log) => (
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
          {goldAuditLogs.length === 0 && <p className="empty-state">Nenhum ajuste de ouro registrado.</p>}
        </div>
      </div>

      <div className="surface-panel">
        <div className="panel-title">
          <PackagePlus size={20} />
          <h3>Histórico de estoque</h3>
        </div>
        <div className="history-list">
          {stockMovements.slice(0, 15).map((movement) => (
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
          {stockMovements.length === 0 && <p className="empty-state">Nenhuma movimentação registrada.</p>}
        </div>
      </div>

      <PurchaseHistory api={api} isMaster refreshKey={purchasesKey} embedded />
    </div>
  );
}
