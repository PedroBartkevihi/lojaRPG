import { useCallback, useEffect, useState } from 'react';
import { Backpack, Coins, HandCoins, History, Sparkles } from 'lucide-react';
import { rarityTier } from '../js/itemVisuals.js';
import InventoryLogList from './InventoryLogList.jsx';
import ItemIcon from './ItemIcon.jsx';

export default function InventoryPanel({ api, character: selectedCharacter, refreshKey, showNotice, onRefreshSession }) {
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [character, setCharacter] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [busyItemId, setBusyItemId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInventory = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.myInventory({ characterId: selectedCharacter?.id });
      setInventory(data.inventory);
      setLogs(data.logs || []);
      setCharacter(data.character);
    } catch (error) {
      showNotice?.(error.message);
    } finally {
      setLoading(false);
    }
  }, [api, selectedCharacter?.id, showNotice]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory, refreshKey]);

  function quantityFor(entry) {
    const value = Number(quantities[entry.itemId]) || 1;
    return Math.min(Math.max(1, value), entry.quantity);
  }

  async function handleAction(entry, action) {
    const quantity = quantityFor(entry);
    const { item } = entry;
    const question =
      action === 'sell'
        ? `Vender ${quantity}x ${item.name} por ${item.effectiveSellPrice * quantity} ouro?`
        : `Usar ${quantity}x ${item.name}? O item sai do inventário.`;

    if (!window.confirm(question)) {
      return;
    }

    setBusyItemId(entry.itemId);

    try {
      const body = { itemId: item.id, quantity };
      const data =
        action === 'sell' ? await api.sellItem(character.id, body) : await api.useItem(character.id, body);
      setQuantities((current) => ({ ...current, [entry.itemId]: '' }));
      showNotice?.(data.message);

      // Atualizar a sessao muda o ouro do personagem e recarrega este painel.
      if (onRefreshSession) {
        await onRefreshSession();
      } else {
        await loadInventory();
      }
    } catch (error) {
      showNotice?.(error.message);
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <section className="wide-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Itens conquistados</p>
          <h2>Inventário{character ? ` de ${character.name}` : ''}</h2>
        </div>
        {character && (
          <span className="gold-badge">
            <Coins size={18} />
            {character.gold} ouro
          </span>
        )}
      </div>
      <div className="surface-panel">
        <div className="panel-title">
          <Backpack size={20} />
          <h3>Equipamentos</h3>
        </div>
        {loading && inventory.length === 0 ? (
          <p className="empty-state">Carregando inventário...</p>
        ) : (
          <div className="inventory-grid">
            {inventory.map((entry) => {
              const sellable = entry.item.effectiveSellPrice !== null;
              const busy = busyItemId === entry.itemId;

              return (
                <article className="inventory-item" key={entry.id} data-rarity-tier={rarityTier(entry.item.rarityRank)}>
                  <div className="inventory-item-header">
                    <ItemIcon category={entry.item.category} size={18} />
                    <div>
                      <span>{entry.item.category}</span>
                      <strong>{entry.item.name}</strong>
                    </div>
                    <b>{entry.quantity}x</b>
                  </div>
                  <p>{entry.item.description}</p>
                  <small className="sell-hint">
                    {sellable ? `A loja paga ${entry.item.effectiveSellPrice} ouro cada` : 'A loja não compra este item'}
                  </small>
                  <div className="inventory-actions">
                    {entry.quantity > 1 && (
                      <input
                        type="number"
                        min="1"
                        max={entry.quantity}
                        value={quantities[entry.itemId] ?? ''}
                        placeholder="1"
                        aria-label={`Quantidade de ${entry.item.name}`}
                        onChange={(event) =>
                          setQuantities((current) => ({ ...current, [entry.itemId]: event.target.value }))
                        }
                      />
                    )}
                    <button className="secondary-action" onClick={() => handleAction(entry, 'use')} disabled={busy}>
                      <Sparkles size={16} />
                      Usar
                    </button>
                    {sellable && (
                      <button className="primary-action" onClick={() => handleAction(entry, 'sell')} disabled={busy}>
                        <HandCoins size={16} />
                        Vender
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {inventory.length === 0 && <p className="empty-state">Inventário vazio.</p>}
          </div>
        )}
      </div>
      <div className="surface-panel inventory-history">
        <div className="panel-title">
          <History size={20} />
          <h3>Movimentações</h3>
        </div>
        <InventoryLogList logs={logs} limit={15} />
      </div>
    </section>
  );
}
