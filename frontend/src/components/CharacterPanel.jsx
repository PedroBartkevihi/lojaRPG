import { useState } from 'react';
import { Save, ScrollText, UserPlus, X } from 'lucide-react';

const emptyForm = {
  name: '',
  className: '',
  race: '',
  level: 1
};

export default function CharacterPanel({
  api,
  character,
  characters = [],
  selectedCharacterId,
  onSelectCharacter,
  onRefreshSession,
  showNotice
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  // Quem ja tem personagem pode criar outro na mesma mesa (ex.: um aliado).
  const [creating, setCreating] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createCharacter(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await api.createCharacter({
        ...form,
        level: Number(form.level)
      });
      await onRefreshSession();
      // O personagem novo vira o ativo, para as compras irem para ele.
      if (data?.character?.id) {
        onSelectCharacter?.(data.character.id);
      }
      setForm(emptyForm);
      setCreating(false);
      showNotice('Personagem criado.');
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (character && !creating) {
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
            <dt>Raça</dt>
            <dd>{character.race}</dd>
          </div>
          <div>
            <dt>Nível</dt>
            <dd>{character.level}</dd>
          </div>
          <div>
            <dt>Ouro</dt>
            <dd>{character.gold}</dd>
          </div>
        </dl>
        <button type="button" className="text-action new-character" onClick={() => setCreating(true)}>
          <UserPlus size={16} />
          Novo personagem
        </button>
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
          Raça
          <input value={form.race} onChange={(event) => updateField('race', event.target.value)} required />
        </label>
        <label>
          Nível
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
      <div className="form-actions">
        <button className="primary-action" disabled={loading}>
          <Save size={17} />
          Salvar personagem
        </button>
        {character && (
          <button type="button" className="secondary-action" onClick={() => setCreating(false)}>
            <X size={17} />
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
