import { useState } from 'react';
import { Coins, Gift, PackagePlus } from 'lucide-react';

const emptyItemReward = { characterId: '', itemId: '', quantity: 1, reason: '' };

// Recompensas da aventura: ouro dividido entre o grupo (ou o mesmo valor para
// cada um) e itens entregues direto no inventario, inclusive os fora da loja.
export default function RewardsPanel({ api, characters, items, showNotice, onDone }) {
  const [excludedIds, setExcludedIds] = useState([]);
  const [goldReward, setGoldReward] = useState({ total: '', mode: 'split', reason: '' });
  const [itemReward, setItemReward] = useState(emptyItemReward);
  const [saving, setSaving] = useState('');

  const selected = characters.filter((character) => !excludedIds.includes(character.id));
  const total = Number(goldReward.total) || 0;
  const splitting = goldReward.mode === 'split';
  const share = splitting && selected.length > 0 ? Math.floor(total / selected.length) : total;
  const remainder = splitting && selected.length > 0 ? total - share * selected.length : 0;
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  function toggleCharacter(id) {
    setExcludedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  function updateGold(field, value) {
    setGoldReward((current) => ({ ...current, [field]: value }));
  }

  function updateItem(field, value) {
    setItemReward((current) => ({ ...current, [field]: value }));
  }

  async function giveGold(event) {
    event.preventDefault();
    setSaving('gold');

    try {
      const data = await api.giveGold({
        characterIds: selected.map((character) => character.id),
        total,
        mode: goldReward.mode,
        reason: goldReward.reason
      });
      setGoldReward((current) => ({ ...current, total: '', reason: '' }));
      await onDone();
      showNotice(data.message);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setSaving('');
    }
  }

  async function giveItem(event) {
    event.preventDefault();
    setSaving('item');

    try {
      const data = await api.giveItem({
        characterId: Number(itemReward.characterId),
        itemId: Number(itemReward.itemId),
        quantity: Number(itemReward.quantity),
        reason: itemReward.reason
      });
      setItemReward((current) => ({ ...current, quantity: 1, reason: '' }));
      await onDone();
      showNotice(data.message);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setSaving('');
    }
  }

  if (characters.length === 0) {
    return (
      <div className="surface-panel">
        <div className="panel-title">
          <Gift size={20} />
          <h3>Recompensas</h3>
        </div>
        <p className="empty-state">Nenhum personagem na mesa ainda.</p>
      </div>
    );
  }

  return (
    <div className="surface-panel rewards-panel">
      <div className="panel-title">
        <Gift size={20} />
        <h3>Recompensas</h3>
      </div>

      <form className="stack-form compact-form" onSubmit={giveGold}>
        <p className="fieldset-title">Ouro para o grupo</p>
        <div className="checkbox-list">
          {characters.map((character) => (
            <label className="checkbox-field" key={character.id}>
              <input
                type="checkbox"
                checked={!excludedIds.includes(character.id)}
                onChange={() => toggleCharacter(character.id)}
              />
              {character.name}
            </label>
          ))}
        </div>
        <div className="form-grid two">
          <label>
            Ouro
            <input
              type="number"
              min="1"
              value={goldReward.total}
              onChange={(event) => updateGold('total', event.target.value)}
              required
            />
          </label>
          <label>
            Distribuição
            <select value={goldReward.mode} onChange={(event) => updateGold('mode', event.target.value)}>
              <option value="split">Dividir entre eles</option>
              <option value="each">Cada um recebe</option>
            </select>
          </label>
        </div>
        <label>
          Motivo
          <input
            value={goldReward.reason}
            onChange={(event) => updateGold('reason', event.target.value)}
            placeholder="Tesouro do covil, pagamento da missão..."
            required
          />
        </label>
        {total > 0 && selected.length > 0 && (
          <p className="form-hint" aria-live="polite">
            {splitting
              ? `Cada personagem recebe ${share} de ouro${remainder > 0 ? `; sobra ${remainder}` : ''}.`
              : `Cada personagem recebe ${total} de ouro, ${total * selected.length} no total.`}
          </p>
        )}
        <button className="primary-action" disabled={saving === 'gold' || selected.length === 0}>
          <Coins size={17} />
          {saving === 'gold' ? 'Entregando...' : 'Dar ouro'}
        </button>
      </form>

      <form className="stack-form compact-form" onSubmit={giveItem}>
        <p className="fieldset-title">Item para um personagem</p>
        <div className="form-grid two">
          <label>
            Personagem
            <select
              value={itemReward.characterId}
              onChange={(event) => updateItem('characterId', event.target.value)}
              required
            >
              <option value="">Escolha</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input
              type="number"
              min="1"
              value={itemReward.quantity}
              onChange={(event) => updateItem('quantity', event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Item
          <select value={itemReward.itemId} onChange={(event) => updateItem('itemId', event.target.value)} required>
            <option value="">Escolha</option>
            {sortedItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? '' : ' (fora da loja)'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Motivo (opcional)
          <input
            value={itemReward.reason}
            onChange={(event) => updateItem('reason', event.target.value)}
            placeholder="Baú do templo, presente do rei..."
          />
        </label>
        <p className="form-hint">O item vem da aventura: o estoque da loja não muda.</p>
        <button className="secondary-action" disabled={saving === 'item'}>
          <PackagePlus size={17} />
          {saving === 'item' ? 'Entregando...' : 'Dar item'}
        </button>
      </form>
    </div>
  );
}
