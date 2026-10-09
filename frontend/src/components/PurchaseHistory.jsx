import { useEffect, useState } from 'react';
import { ReceiptText } from 'lucide-react';

export default function PurchaseHistory({ api, isMaster, character, refreshKey, embedded = false }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPurchases() {
      setError('');

      try {
        const data = isMaster ? await api.listPurchases() : await api.myPurchases({ characterId: character?.id });
        setPurchases(data.purchases);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadPurchases();
  }, [api, isMaster, character?.id, refreshKey]);

  const content = (
    <div className="surface-panel">
      <div className="panel-title">
        <ReceiptText size={20} />
        <h3>Histórico de compras</h3>
      </div>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="empty-state">Carregando compras...</p>
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
