import { useState } from 'react';
import { UserPlus } from 'lucide-react';

export default function RegisterPage({ api, onRegister, onSwitch }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'JOGADOR',
    masterKey: '',
    characterName: '',
    className: '',
    race: '',
    level: 1
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        masterKey: form.masterKey || undefined
      };

      if (form.role === 'JOGADOR' && form.characterName) {
        body.character = {
          name: form.characterName,
          className: form.className,
          race: form.race,
          level: Number(form.level)
        };
      }

      const data = await api.register(body);
      onRegister(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <h2>Criar acesso</h2>
      <label>
        Nome
        <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
      </label>
      <label>
        Email
        <input value={form.email} onChange={(event) => updateField('email', event.target.value)} type="email" required />
      </label>
      <label>
        Senha
        <input
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          type="password"
          minLength={6}
          required
        />
      </label>
      <label>
        Tipo
        <select value={form.role} onChange={(event) => updateField('role', event.target.value)}>
          <option value="JOGADOR">Jogador</option>
          <option value="MESTRE">Mestre</option>
        </select>
      </label>
      {form.role === 'MESTRE' && (
        <label>
          Chave de Mestre
          <input value={form.masterKey} onChange={(event) => updateField('masterKey', event.target.value)} />
        </label>
      )}
      {form.role === 'JOGADOR' && (
        <div className="fieldset">
          <p className="fieldset-title">Personagem inicial</p>
          <label>
            Nome
            <input value={form.characterName} onChange={(event) => updateField('characterName', event.target.value)} />
          </label>
          <div className="form-grid">
            <label>
              Classe
              <input value={form.className} onChange={(event) => updateField('className', event.target.value)} />
            </label>
            <label>
              Raca
              <input value={form.race} onChange={(event) => updateField('race', event.target.value)} />
            </label>
            <label>
              Nivel
              <input
                value={form.level}
                onChange={(event) => updateField('level', event.target.value)}
                type="number"
                min="1"
                max="20"
              />
            </label>
          </div>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" disabled={loading}>
        <UserPlus size={18} />
        {loading ? 'Criando...' : 'Cadastrar'}
      </button>
      <button type="button" className="text-action" onClick={onSwitch}>
        Ja tenho acesso
      </button>
    </form>
  );
}
