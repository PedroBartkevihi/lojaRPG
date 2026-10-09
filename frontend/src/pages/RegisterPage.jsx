import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { SLOW_API_MESSAGE, useSlowHint } from '../js/useSlowHint.js';

// A conta nao tem papel: quem cria uma mesa e o Mestre dela, e quem entra por
// convite cria o personagem dentro da mesa.
export default function RegisterPage({ api, onRegister, onSwitch }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const slow = useSlowHint(loading);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.register(form);
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
      {slow && <p className="form-hint slow-hint">{SLOW_API_MESSAGE}</p>}
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" disabled={loading}>
        <UserPlus size={18} />
        {loading ? 'Criando...' : 'Cadastrar'}
      </button>
      <button type="button" className="text-action" onClick={onSwitch}>
        Já tenho acesso
      </button>
    </form>
  );
}
