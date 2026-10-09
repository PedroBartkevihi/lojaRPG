export function describeInventoryLog(log) {
  if (log.type === 'VENDA') {
    return `Vendeu ${log.quantity}x ${log.itemName} por ${log.total} ouro`;
  }

  if (log.type === 'USO') {
    return `Usou ${log.quantity}x ${log.itemName}`;
  }

  return `Recebeu ${log.quantity}x ${log.itemName} de ${log.actorName || 'Mestre'}`;
}

// Vendas, usos e recompensas. O Mestre ve a mesa toda, entao cada linha leva
// o nome do personagem.
export default function InventoryLogList({ logs, showCharacter = false, limit }) {
  const visibleLogs = limit ? logs.slice(0, limit) : logs;

  return (
    <div className="history-list">
      {visibleLogs.map((log) => (
        <article className="history-entry" key={log.id}>
          <header>
            <div>
              <strong>
                {showCharacter ? `${log.characterName}: ` : ''}
                {describeInventoryLog(log)}
              </strong>
              <span>{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          </header>
          {log.reason && <p>{log.reason}</p>}
        </article>
      ))}
      {logs.length === 0 && <p className="empty-state">Nenhuma movimentacao registrada.</p>}
    </div>
  );
}
