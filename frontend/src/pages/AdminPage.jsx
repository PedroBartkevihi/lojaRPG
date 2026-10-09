import { useEffect, useMemo, useState } from 'react';
import { Coins, Gift, PackagePlus, Pencil, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import AdminItemForm from '../components/AdminItemForm.jsx';
import InventoryLogList from '../components/InventoryLogList.jsx';
import PurchaseHistory from '../components/PurchaseHistory.jsx';
import RewardsPanel from '../components/RewardsPanel.jsx';

export default function AdminPage({ api, showNotice, onRefresh }) {
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [goldAuditLogs, setGoldAuditLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [goldInputs, setGoldInputs] = useState({});
  const [goldReasons, setGoldReasons] = useState({});
  const [filters, setFilters] = useState({ search: '', category: '', rarity: '', status: 'active' });
  const [newCategory, setNewCategory] = useState('');
  const [newRarity, setNewRarity] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingRarityId, setEditingRarityId] = useState(null);
  const [editingCharacterId, setEditingCharacterId] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState({ name: '', description: '' });
  const [rarityDraft, setRarityDraft] = useState({ name: '', rank: 1, description: '' });
  const [characterDraft, setCharacterDraft] = useState({ name: '', className: '', race: '', level: 1 });
  const [loading, setLoading] = useState(true);

  async function loadAdminData() {
    setLoading(true);

    try {
      const [itemsData, charactersData, auditData, categoriesData, raritiesData, stockData, logsData] =
        await Promise.all([
          api.listItems({ includeInactive: true }),
          api.listCharacters(),
          api.listGoldAudit(),
          api.listCategories(),
          api.listRarities(),
          api.listStockMovements(),
          api.listInventoryLogs()
        ]);
      setItems(itemsData.items);
      setCharacters(charactersData.characters);
      setGoldAuditLogs(auditData.logs);
      setCategories(categoriesData.categories);
      setRarities(raritiesData.rarities);
      setStockMovements(stockData.movements);
      setInventoryLogs(logsData.logs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData().catch((error) => showNotice(error.message));
  }, []);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filters.status === 'active' && !item.isActive) return false;
        if (filters.status === 'inactive' && item.isActive) return false;
        if (filters.category && item.category !== filters.category) return false;
        if (filters.rarity && item.rarity !== filters.rarity) return false;
        if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filters, items]);

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

  async function reactivate(item) {
    await api.reactivateItem(item.id);
    await loadAdminData();
    showNotice('Item reativado.');
  }

  async function addCategory(event) {
    event.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await api.createCategory({ name: newCategory.trim() });
      setNewCategory('');
      await loadAdminData();
      showNotice('Categoria criada.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function addRarity(event) {
    event.preventDefault();
    if (!newRarity.trim()) return;
    try {
      await api.createRarity({ name: newRarity.trim(), rank: rarities.length + 1 });
      setNewRarity('');
      await loadAdminData();
      showNotice('Raridade criada.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  function startCategoryEdit(category) {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      name: category.name,
      description: category.description || ''
    });
  }

  async function saveCategory(category) {
    try {
      await api.updateCategory(category.id, categoryDraft);
      setEditingCategoryId(null);
      await loadAdminData();
      showNotice('Categoria atualizada.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function removeCategory(category) {
    const itemCount = Number(category.itemCount || 0);

    if (category.name === 'Sem categoria' && itemCount > 0) {
      showNotice('Nao e possivel remover Sem categoria enquanto existem itens vinculados.');
      return;
    }

    const confirmed = window.confirm(
      itemCount > 0
        ? `Remover a categoria ${category.name}? ${itemCount} item(ns) sera(o) movido(s) para Sem categoria.`
        : `Remover a categoria ${category.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const data = await api.deleteCategory(category.id);
      await loadAdminData();
      showNotice(data.message || 'Categoria removida.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  function startRarityEdit(rarity) {
    setEditingRarityId(rarity.id);
    setRarityDraft({
      name: rarity.name,
      rank: rarity.rank,
      description: rarity.description || ''
    });
  }

  async function saveRarity(rarity) {
    try {
      await api.updateRarity(rarity.id, {
        ...rarityDraft,
        rank: Number(rarityDraft.rank)
      });
      setEditingRarityId(null);
      await loadAdminData();
      showNotice('Raridade atualizada.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function removeRarity(rarity) {
    const itemCount = Number(rarity.itemCount || 0);

    if (rarity.name === 'Comum' && itemCount > 0) {
      showNotice('Nao e possivel remover Comum enquanto existem itens vinculados.');
      return;
    }

    const confirmed = window.confirm(
      itemCount > 0
        ? `Remover a raridade ${rarity.name}? ${itemCount} item(ns) sera(o) movido(s) para Comum.`
        : `Remover a raridade ${rarity.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const data = await api.deleteRarity(rarity.id);
      await loadAdminData();
      showNotice(data.message || 'Raridade removida.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  function startCharacterEdit(character) {
    setEditingCharacterId(character.id);
    setCharacterDraft({
      name: character.name,
      className: character.className,
      race: character.race,
      level: character.level
    });
  }

  async function saveCharacter(character) {
    try {
      await api.updateCharacter(character.id, {
        ...characterDraft,
        level: Number(characterDraft.level)
      });
      setEditingCharacterId(null);
      await loadAdminData();
      await onRefresh();
      showNotice('Personagem atualizado.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function applyGold(character) {
    const amount = Number(goldInputs[character.id] || 0);
    const reason = (goldReasons[character.id] || '').trim();

    if (!Number.isInteger(amount) || amount === 0) {
      showNotice('Informe um ajuste de ouro inteiro diferente de zero.');
      return;
    }

    if (!reason) {
      showNotice('Informe o motivo da alteracao de ouro.');
      return;
    }

    const data = await api.changeGold(character.id, { amount, mode: 'adjust', reason });
    setGoldInputs((current) => ({ ...current, [character.id]: '' }));
    setGoldReasons((current) => ({ ...current, [character.id]: '' }));
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

        <AdminItemForm
          item={editingItem}
          categories={categories}
          rarities={rarities}
          onSave={saveItem}
          onCancel={() => setEditingItem(null)}
        />

        <div className="surface-panel">
          <div className="panel-title">
            <PackagePlus size={20} />
            <h3>Itens cadastrados</h3>
          </div>
          <div className="toolbar admin-filters">
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Filtrar por nome"
            />
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">Todas categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={filters.rarity}
              onChange={(event) => setFilters((current) => ({ ...current, rarity: event.target.value }))}
            >
              <option value="">Todas raridades</option>
              {rarities.map((rarity) => (
                <option key={rarity.id} value={rarity.name}>
                  {rarity.name}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>
          </div>
          {loading ? (
            <p className="empty-state">Carregando...</p>
          ) : (
            <div className="admin-list">
              {filteredItems.map((item) => (
                <div className="admin-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.category} - {item.rarity} - {item.price} ouro -{' '}
                      {item.isSellable ? `revenda ${item.effectiveSellPrice}` : 'loja nao compra'} - estoque {item.stock} -{' '}
                      {item.isActive ? 'ativo' : 'inativo'}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button className="secondary-action" onClick={() => setEditingItem(item)}>
                      <Pencil size={17} />
                      Editar
                    </button>
                    {item.isActive ? (
                      <button className="danger-action" onClick={() => removeItem(item)}>
                        <Trash2 size={17} />
                        Remover
                      </button>
                    ) : (
                      <button className="secondary-action" onClick={() => reactivate(item)}>
                        <RefreshCcw size={17} />
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && <p className="empty-state">Nenhum item encontrado.</p>}
            </div>
          )}
        </div>
      </div>

      <aside className="admin-side">
        <RewardsPanel
          api={api}
          characters={characters}
          items={items}
          showNotice={showNotice}
          onDone={async () => {
            await loadAdminData();
            await onRefresh();
          }}
        />
        <div className="surface-panel">
          <div className="panel-title">
            <PackagePlus size={20} />
            <h3>Catalogo</h3>
          </div>
          <form className="inline-form" onSubmit={addCategory}>
            <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nova categoria" />
            <button className="secondary-action">Adicionar</button>
          </form>
          <div className="catalog-list">
            {categories.map((category) => (
              <div className="catalog-row" key={category.id}>
                {editingCategoryId === category.id ? (
                  <>
                    <input
                      value={categoryDraft.name}
                      onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))}
                      aria-label="Nome da categoria"
                    />
                    <div className="row-actions">
                      <button type="button" className="icon-button" onClick={() => saveCategory(category)} title="Salvar categoria">
                        <Save size={17} />
                      </button>
                      <button type="button" className="icon-button" onClick={() => setEditingCategoryId(null)} title="Cancelar edicao">
                        <X size={17} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="category-pill">
                      {category.name}
                      {Number(category.itemCount || 0) > 0 ? ` (${category.itemCount})` : ''}
                    </span>
                    <div className="row-actions">
                      <button type="button" className="icon-button" onClick={() => startCategoryEdit(category)} title="Editar categoria">
                        <Pencil size={17} />
                      </button>
                      <button type="button" className="icon-button danger" onClick={() => removeCategory(category)} title="Remover categoria">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <form className="inline-form" onSubmit={addRarity}>
            <input value={newRarity} onChange={(event) => setNewRarity(event.target.value)} placeholder="Nova raridade" />
            <button className="secondary-action">Adicionar</button>
          </form>
          <div className="catalog-list">
            {rarities.map((rarity) => (
              <div className="catalog-row" key={rarity.id}>
                {editingRarityId === rarity.id ? (
                  <>
                    <input
                      value={rarityDraft.name}
                      onChange={(event) => setRarityDraft((current) => ({ ...current, name: event.target.value }))}
                      aria-label="Nome da raridade"
                    />
                    <input
                      type="number"
                      min="1"
                      value={rarityDraft.rank}
                      onChange={(event) => setRarityDraft((current) => ({ ...current, rank: event.target.value }))}
                      aria-label="Rank da raridade"
                    />
                    <div className="row-actions">
                      <button type="button" className="icon-button" onClick={() => saveRarity(rarity)} title="Salvar raridade">
                        <Save size={17} />
                      </button>
                      <button type="button" className="icon-button" onClick={() => setEditingRarityId(null)} title="Cancelar edicao">
                        <X size={17} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="rarity">
                      {rarity.name} #{rarity.rank}
                      {Number(rarity.itemCount || 0) > 0 ? ` (${rarity.itemCount})` : ''}
                    </span>
                    <div className="row-actions">
                      <button type="button" className="icon-button" onClick={() => startRarityEdit(rarity)} title="Editar raridade">
                        <Pencil size={17} />
                      </button>
                      <button type="button" className="icon-button danger" onClick={() => removeRarity(rarity)} title="Remover raridade">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="surface-panel">
          <div className="panel-title">
            <Coins size={20} />
            <h3>Ouro dos personagens</h3>
          </div>
          <div className="admin-list compact">
            {characters.map((character) => (
              <div className="admin-row" key={character.id}>
                {editingCharacterId === character.id ? (
                  <div className="character-edit">
                    <div className="form-grid two">
                      <input
                        value={characterDraft.name}
                        onChange={(event) => setCharacterDraft((current) => ({ ...current, name: event.target.value }))}
                        aria-label="Nome do personagem"
                      />
                      <input
                        value={characterDraft.className}
                        onChange={(event) => setCharacterDraft((current) => ({ ...current, className: event.target.value }))}
                        aria-label="Classe do personagem"
                      />
                      <input
                        value={characterDraft.race}
                        onChange={(event) => setCharacterDraft((current) => ({ ...current, race: event.target.value }))}
                        aria-label="Raca do personagem"
                      />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={characterDraft.level}
                        onChange={(event) => setCharacterDraft((current) => ({ ...current, level: event.target.value }))}
                        aria-label="Nivel do personagem"
                      />
                    </div>
                    <div className="row-actions">
                      <button type="button" className="secondary-action" onClick={() => saveCharacter(character)}>
                        <Save size={17} />
                        Salvar
                      </button>
                      <button type="button" className="text-action" onClick={() => setEditingCharacterId(null)}>
                        <X size={17} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <strong>{character.name}</strong>
                      <span>
                        {character.userName} - {character.className} nivel {character.level} - {character.gold} ouro
                      </span>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="icon-button" onClick={() => startCharacterEdit(character)} title="Editar personagem">
                        <Pencil size={17} />
                      </button>
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
                      <input
                        value={goldReasons[character.id] || ''}
                        onChange={(event) =>
                          setGoldReasons((current) => ({ ...current, [character.id]: event.target.value }))
                        }
                        placeholder="Motivo"
                      />
                      <button className="secondary-action" onClick={() => applyGold(character)}>
                        Aplicar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="surface-panel">
          <div className="panel-title">
            <PackagePlus size={20} />
            <h3>Historico de estoque</h3>
          </div>
          <div className="history-list">
            {stockMovements.slice(0, 8).map((movement) => (
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
            {stockMovements.length === 0 && <p className="empty-state">Nenhuma movimentacao registrada.</p>}
          </div>
        </div>
        <div className="surface-panel">
          <div className="panel-title">
            <Gift size={20} />
            <h3>Vendas, usos e recompensas</h3>
          </div>
          <InventoryLogList logs={inventoryLogs} showCharacter limit={10} />
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
            {goldAuditLogs.length === 0 && <p className="empty-state">Nenhum ajuste manual registrado.</p>}
          </div>
        </div>
        <PurchaseHistory api={api} isMaster refreshKey={items.length + characters.length} embedded />
      </aside>
    </section>
  );
}
