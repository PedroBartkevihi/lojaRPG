import { useState } from 'react';
import { Coins, Pencil, Save, X } from 'lucide-react';
import RewardsPanel from '../RewardsPanel.jsx';

// Aba usada durante a sessao: recompensas para o grupo e o ouro e os dados de
// cada personagem.
export default function PartyTab({ api, characters, items, reload, onRefresh, showNotice }) {
  const [goldInputs, setGoldInputs] = useState({});
  const [goldReasons, setGoldReasons] = useState({});
  const [editingCharacterId, setEditingCharacterId] = useState(null);
  const [characterDraft, setCharacterDraft] = useState({ name: '', className: '', race: '', level: 1 });

  async function refreshAll() {
    await reload();
    await onRefresh();
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
      await refreshAll();
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
      showNotice('Informe o motivo da alteração de ouro.');
      return;
    }

    try {
      const data = await api.changeGold(character.id, { amount, mode: 'adjust', reason });
      setGoldInputs((current) => ({ ...current, [character.id]: '' }));
      setGoldReasons((current) => ({ ...current, [character.id]: '' }));
      await refreshAll();
      showNotice(`${data.character.name} agora possui ${data.character.gold} ouro.`);
    } catch (error) {
      showNotice(error.message);
    }
  }

  return (
    <div className="content-grid admin-tab">
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
                      aria-label="Raça do personagem"
                    />
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={characterDraft.level}
                      onChange={(event) => setCharacterDraft((current) => ({ ...current, level: event.target.value }))}
                      aria-label="Nível do personagem"
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
                  <div className="character-summary">
                    <div>
                      <strong>{character.name}</strong>
                      <span>
                        {character.userName} - {character.className} nível {character.level}
                      </span>
                    </div>
                    <span className="gold-badge">
                      <Coins size={16} />
                      {character.gold} ouro
                    </span>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => startCharacterEdit(character)}
                      title="Editar personagem"
                    >
                      <Pencil size={17} />
                    </button>
                  </div>
                  <div className="gold-adjust">
                    <input
                      type="number"
                      value={goldInputs[character.id] || ''}
                      onChange={(event) => setGoldInputs((current) => ({ ...current, [character.id]: event.target.value }))}
                      placeholder="+/-"
                      aria-label={`Ajuste de ouro de ${character.name}`}
                    />
                    <input
                      value={goldReasons[character.id] || ''}
                      onChange={(event) => setGoldReasons((current) => ({ ...current, [character.id]: event.target.value }))}
                      placeholder="Motivo"
                      aria-label={`Motivo do ajuste de ${character.name}`}
                    />
                    <button className="secondary-action" onClick={() => applyGold(character)}>
                      Aplicar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {characters.length === 0 && (
            <p className="empty-state">Nenhum personagem ainda. Envie o convite da aba Mesa para os jogadores.</p>
          )}
        </div>
      </div>
      <RewardsPanel api={api} characters={characters} items={items} showNotice={showNotice} onDone={refreshAll} />
    </div>
  );
}
