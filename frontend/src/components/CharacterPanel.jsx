import { useState } from 'react';
import { Save, ScrollText } from 'lucide-react';

export default function CharacterPanel({
  api,
  character,
  characters = [],
  selectedCharacterId,
  onSelectCharacter,
  onRefreshSession,
  showNotice
}) {
  const [form, setForm] = useState({
    name: '',
    className: '',
    race: '',
    level: 1
  });
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createCharacter(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await api.createCharacter({
        ...form,
        level: Number(form.level)
      });
      await onRefreshSession();
      showNotice('Personagem criado.');
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (character) {
    return (
      <div className="surface-panel character-panel">
        <div className="panel-title">
          <ScrollText size={20} />
          <h3>{character.name}</h3>
        </div>
        {characters.length > 1 && (
          <label className="character-selector">
            Personagem ativo
            <select
              value={selectedCharacterId || character.id}
              onChange={(event) => onSelectCharacter?.(Number(event.target.value))}
            >
              {characters.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <dl className="character-stats">
          <div>
            <dt>Classe</dt>
            <dd>{character.className}</dd>
          </div>
          <div>
            <dt>Raca</dt>
            <dd>{character.race}</dd>
          </div>
          <div>
            <dt>Nivel</dt>
            <dd>{character.level}</dd>
          </div>
          <div>
            <dt>Ouro</dt>
            <dd>{character.gold}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <form className="surface-panel stack-form compact-form" onSubmit={createCharacter}>
      <div className="panel-title">
        <ScrollText size={20} />
        <h3>Criar personagem</h3>
      </div>
      <label>
        Nome
        <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
      </label>
      <div className="form-grid">
        <label>
          Classe
          <input value={form.className} onChange={(event) => updateField('className', event.target.value)} required />
        </label>
        <label>
          Raca
          <input value={form.race} onChange={(event) => updateField('race', event.target.value)} required />
        </label>
        <label>
          Nivel
          <input
            value={form.level}
            onChange={(event) => updateField('level', event.target.value)}
            type="number"
            min="1"
            max="20"
            required
          />
        </label>
      </div>
      <button className="primary-action" disabled={loading}>
        <Save size={17} />
        Salvar personagem
      </button>
    </form>
  );
}
