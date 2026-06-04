import { useEffect, useState } from 'react';
import { Backpack } from 'lucide-react';

export default function InventoryPanel({ api, refreshKey, showNotice }) {
  const [inventory, setInventory] = useState([]);
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInventory() {
      setLoading(true);

      try {
        const data = await api.myInventory();
        setInventory(data.inventory);
        setCharacter(data.character);
      } catch (error) {
        showNotice?.(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadInventory();
  }, [api, refreshKey, showNotice]);

  return (
    <section className="wide-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Itens conquistados</p>
          <h2>Inventario{character ? ` de ${character.name}` : ''}</h2>
        </div>
      </div>
      <div className="surface-panel">
        <div className="panel-title">
          <Backpack size={20} />
          <h3>Equipamentos</h3>
        </div>
        {loading ? (
          <p className="empty-state">Carregando inventario...</p>
        ) : (
          <div className="inventory-grid">
            {inventory.map((entry) => (
              <article className="inventory-item" key={entry.id}>
                <span>{entry.item.category}</span>
                <strong>{entry.item.name}</strong>
                <p>{entry.item.description}</p>
                <b>{entry.quantity}x</b>
              </article>
            ))}
            {inventory.length === 0 && <p className="empty-state">Inventario vazio.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
