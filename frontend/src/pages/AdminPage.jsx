import { useEffect, useMemo, useState } from 'react';
import { Coins, PackagePlus, RefreshCcw } from 'lucide-react';
import AdminItemForm from '../components/AdminItemForm.jsx';
import PurchaseHistory from '../components/PurchaseHistory.jsx';

export default function AdminPage({ api, showNotice, onRefresh }) {
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [goldInputs, setGoldInputs] = useState({});
  const [loading, setLoading] = useState(true);

  async function loadAdminData() {
    setLoading(true);
    const [itemsData, charactersData] = await Promise.all([
      api.listItems({ includeInactive: true }),
      api.listCharacters()
    ]);
    setItems(itemsData.items);
    setCharacters(charactersData.characters);
    setLoading(false);
  }

  useEffect(() => {
    loadAdminData().catch((error) => showNotice(error.message));
  }, []);

  const activeItems = useMemo(() => items.filter((item) => item.isActive), [items]);

  async function saveItem(form) {
    const action = editingItem ? api.updateItem(editingItem.id, form) : api.createItem(form);
    const data = await action;
    setEditingItem(null);
    await loadAdminData();
    showNotice(editingItem ? `Item atualizado: ${data.item.name}` : `Item criado: ${data.item.name}`);
  }

  async function removeItem(item) {
    const confirmed = window.confirm(`Remover ${item.name} da loja?`);

    if (!confirmed) {
      return;
    }

    await api.deleteItem(item.id);
    await loadAdminData();
    showNotice('Item removido da loja.');
  }

  async function applyGold(character) {
    const amount = Number(goldInputs[character.id] || 0);

    if (!Number.isInteger(amount) || amount === 0) {
      showNotice('Informe um ajuste de ouro inteiro diferente de zero.');
      return;
    }

    const data = await api.changeGold(character.id, { amount, mode: 'adjust' });
    setGoldInputs((current) => ({ ...current, [character.id]: '' }));
    await loadAdminData();
    await onRefresh();
    showNotice(`${data.character.name} agora possui ${data.character.gold} ouro.`);
  }

  return (
    <section className="admin-grid">
      <div className="admin-main">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Controle do Mestre</p>
            <h2>Painel administrativo</h2>
          </div>
          <button className="secondary-action" onClick={loadAdminData}>
            <RefreshCcw size={17} />
            Atualizar
          </button>
        </div>

        <AdminItemForm item={editingItem} onSave={saveItem} onCancel={() => setEditingItem(null)} />

        <div className="surface-panel">
          <div className="panel-title">
            <PackagePlus size={20} />
            <h3>Itens cadastrados</h3>
          </div>
          {loading ? (
            <p className="empty-state">Carregando...</p>
          ) : (
            <div className="admin-list">
              {activeItems.map((item) => (
                <div className="admin-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.category} - {item.rarity} - {item.price} ouro - estoque {item.stock}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button className="secondary-action" onClick={() => setEditingItem(item)}>
                      Editar
                    </button>
                    <button className="danger-action" onClick={() => removeItem(item)}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {activeItems.length === 0 && <p className="empty-state">Nenhum item ativo.</p>}
            </div>
          )}
        </div>
      </div>

      <aside className="admin-side">
        <div className="surface-panel">
          <div className="panel-title">
            <Coins size={20} />
            <h3>Ouro dos personagens</h3>
          </div>
          <div className="admin-list compact">
            {characters.map((character) => (
              <div className="admin-row" key={character.id}>
                <div>
                  <strong>{character.name}</strong>
                  <span>
                    {character.userName} - {character.gold} ouro
                  </span>
                </div>
                <div className="gold-adjust">
                  <input
                    type="number"
                    value={goldInputs[character.id] || ''}
                    onChange={(event) =>
                      setGoldInputs((current) => ({ ...current, [character.id]: event.target.value }))
                    }
                    placeholder="+/-"
                  />
                  <button className="secondary-action" onClick={() => applyGold(character)}>
                    Aplicar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <PurchaseHistory api={api} isMaster refreshKey={items.length + characters.length} embedded />
      </aside>
    </section>
  );
}
