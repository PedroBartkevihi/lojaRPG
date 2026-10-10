import { useState } from 'react';
import { Gem, Pencil, Save, Tags, Trash2, X } from 'lucide-react';
import { rarityTier } from '../../js/itemVisuals.js';
import { SkeletonRows } from '../Skeleton.jsx';

// O rank da raridade define a cor dos itens, como nos livros de D&D.
const RARITY_COLORS = [
  { rank: 1, label: 'Comum' },
  { rank: 2, label: 'Incomum' },
  { rank: 3, label: 'Raro' },
  { rank: 4, label: 'Muito raro' },
  { rank: 5, label: 'Lendário' }
];

export default function CatalogTab({ api, categories, rarities, loading, reload, showNotice }) {
  const [newCategory, setNewCategory] = useState('');
  const [newRarity, setNewRarity] = useState('');
  // Sem valor inicial: a cor vinha da ordem de criacao e um "Lendario" criado
  // em quarto lugar ficava com a cor de muito raro.
  const [newRarityRank, setNewRarityRank] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingRarityId, setEditingRarityId] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState({ name: '', description: '' });
  const [rarityDraft, setRarityDraft] = useState({ name: '', rank: 1, description: '' });

  async function run(action, message) {
    try {
      const data = await action();
      await reload();
      showNotice(data?.message || message);
      return true;
    } catch (error) {
      showNotice(error.message);
      return false;
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    if (!newCategory.trim()) return;

    if (await run(() => api.createCategory({ name: newCategory.trim() }), 'Categoria criada.')) {
      setNewCategory('');
    }
  }

  async function addRarity(event) {
    event.preventDefault();
    if (!newRarity.trim() || !newRarityRank) return;

    if (await run(() => api.createRarity({ name: newRarity.trim(), rank: Number(newRarityRank) }), 'Raridade criada.')) {
      setNewRarity('');
      setNewRarityRank('');
    }
  }

  function startCategoryEdit(category) {
    setEditingCategoryId(category.id);
    setCategoryDraft({ name: category.name, description: category.description || '' });
  }

  async function saveCategory(category) {
    if (await run(() => api.updateCategory(category.id, categoryDraft).then(() => null), 'Categoria atualizada.')) {
      setEditingCategoryId(null);
    }
  }

  async function removeCategory(category) {
    const itemCount = Number(category.itemCount || 0);

    if (category.name === 'Sem categoria' && itemCount > 0) {
      showNotice('Não é possível remover Sem categoria enquanto existem itens vinculados.');
      return;
    }

    const question =
      itemCount > 0
        ? `Remover a categoria ${category.name}? ${itemCount} item(ns) será(ão) movido(s) para Sem categoria.`
        : `Remover a categoria ${category.name}?`;

    if (window.confirm(question)) {
      await run(() => api.deleteCategory(category.id), 'Categoria removida.');
    }
  }

  function startRarityEdit(rarity) {
    setEditingRarityId(rarity.id);
    setRarityDraft({ name: rarity.name, rank: rarity.rank, description: rarity.description || '' });
  }

  async function saveRarity(rarity) {
    const body = { ...rarityDraft, rank: Number(rarityDraft.rank) };

    if (await run(() => api.updateRarity(rarity.id, body).then(() => null), 'Raridade atualizada.')) {
      setEditingRarityId(null);
    }
  }

  async function removeRarity(rarity) {
    const itemCount = Number(rarity.itemCount || 0);

    if (rarity.name === 'Comum' && itemCount > 0) {
      showNotice('Não é possível remover Comum enquanto existem itens vinculados.');
      return;
    }

    const question =
      itemCount > 0
        ? `Remover a raridade ${rarity.name}? ${itemCount} item(ns) será(ão) movido(s) para Comum.`
        : `Remover a raridade ${rarity.name}?`;

    if (window.confirm(question)) {
      await run(() => api.deleteRarity(rarity.id), 'Raridade removida.');
    }
  }

  return (
    <div className="panel-grid admin-tab">
      <div className="surface-panel">
        <div className="panel-title">
          <Tags size={20} />
          <h3>Categorias</h3>
        </div>
        <form className="inline-form" onSubmit={addCategory}>
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Nova categoria"
            aria-label="Nova categoria"
          />
          <button className="secondary-action">Adicionar</button>
        </form>
        <div className="catalog-list">
          {loading && <SkeletonRows count={4} />}
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
                    <button type="button" className="icon-button" onClick={() => setEditingCategoryId(null)} title="Cancelar edição">
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
      </div>

      <div className="surface-panel">
        <div className="panel-title">
          <Gem size={20} />
          <h3>Raridades</h3>
        </div>
        <form className="inline-form rarity-form" onSubmit={addRarity}>
          <input
            value={newRarity}
            onChange={(event) => setNewRarity(event.target.value)}
            placeholder="Nova raridade"
            aria-label="Nova raridade"
          />
          <select
            value={newRarityRank}
            onChange={(event) => setNewRarityRank(event.target.value)}
            aria-label="Cor da nova raridade"
            required
          >
            <option value="" disabled>
              Cor
            </option>
            {RARITY_COLORS.map((color) => (
              <option key={color.rank} value={color.rank}>
                {color.label}
              </option>
            ))}
          </select>
          <button className="secondary-action">Adicionar</button>
        </form>
        <p className="form-hint">O rank define a cor: 1 comum, 2 incomum, 3 raro, 4 muito raro, 5 lendário.</p>
        <div className="catalog-list">
          {loading && <SkeletonRows count={3} />}
          {rarities.map((rarity) => (
            <div className="catalog-row" key={rarity.id} data-rarity-tier={rarityTier(rarity.rank)}>
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
                    <button type="button" className="icon-button" onClick={() => setEditingRarityId(null)} title="Cancelar edição">
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
    </div>
  );
}
