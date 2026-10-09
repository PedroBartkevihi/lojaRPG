import { useMemo, useState } from 'react';
import { PackagePlus, Pencil, RefreshCcw, Trash2 } from 'lucide-react';
import AdminItemForm from '../AdminItemForm.jsx';
import { SkeletonRows } from '../Skeleton.jsx';

// Compara sem acentos nem maiusculas: "pocao" encontra "Poção".
function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export default function ItemsTab({ api, items, categories, rarities, loading, reload, showNotice }) {
  const [editingItem, setEditingItem] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '', rarity: '', status: 'active' });

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filters.status === 'active' && !item.isActive) return false;
        if (filters.status === 'inactive' && item.isActive) return false;
        if (filters.category && item.category !== filters.category) return false;
        if (filters.rarity && item.rarity !== filters.rarity) return false;
        if (filters.search && !normalizeText(item.name).includes(normalizeText(filters.search))) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filters, items]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  // No celular o formulario fica depois da lista; editar leva ate ele.
  function startEdit(item) {
    setEditingItem(item);
    document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveItem(form) {
    const data = editingItem ? await api.updateItem(editingItem.id, form) : await api.createItem(form);
    setEditingItem(null);
    await reload();
    showNotice(editingItem ? `Item atualizado: ${data.item.name}` : `Item criado: ${data.item.name}`);
  }

  async function removeItem(item) {
    if (!window.confirm(`Remover ${item.name} da loja?`)) {
      return;
    }

    try {
      await api.deleteItem(item.id);
      await reload();
      showNotice('Item removido da loja.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function reactivate(item) {
    try {
      await api.reactivateItem(item.id);
      await reload();
      showNotice('Item reativado.');
    } catch (error) {
      showNotice(error.message);
    }
  }

  return (
    <div className="content-grid admin-tab">
      <div className="surface-panel">
        <div className="panel-title">
          <PackagePlus size={20} />
          <h3>Itens cadastrados</h3>
        </div>
        <div className="toolbar admin-filters">
          <input
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Filtrar por nome"
            aria-label="Filtrar itens por nome"
          />
          <select
            value={filters.category}
            onChange={(event) => updateFilter('category', event.target.value)}
            aria-label="Filtrar por categoria"
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
            onChange={(event) => updateFilter('rarity', event.target.value)}
            aria-label="Filtrar por raridade"
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
            onChange={(event) => updateFilter('status', event.target.value)}
            aria-label="Filtrar por situação"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
        </div>
        {loading ? (
          <SkeletonRows count={6} />
        ) : (
          <div className="admin-list">
            {filteredItems.map((item) => (
              <div className="admin-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.category} - {item.rarity} - {item.price} ouro -{' '}
                    {item.isSellable ? `revenda ${item.effectiveSellPrice}` : 'loja não compra'} - estoque {item.stock}{' '}
                    - {item.isActive ? 'ativo' : 'inativo'}
                  </span>
                </div>
                <div className="row-actions">
                  <button className="secondary-action" onClick={() => startEdit(item)}>
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
      <AdminItemForm
        item={editingItem}
        categories={categories}
        rarities={rarities}
        onSave={saveItem}
        onCancel={() => setEditingItem(null)}
      />
    </div>
  );
}
