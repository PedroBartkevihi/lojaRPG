import { useState } from 'react';
import { LogIn } from 'lucide-react';

export default function LoginPage({ api, onLogin, onSwitch }) {
  const [email, setEmail] = useState('mestre@lojarpg.local');
  const [password, setPassword] = useState('mestre123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ email, password });
      onLogin(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <h2>Entrar na loja</h2>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label>
        Senha
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" disabled={loading}>
        <LogIn size={18} />
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      <button type="button" className="text-action" onClick={onSwitch}>
        Criar conta de jogador
      </button>
    </form>
  );
}
