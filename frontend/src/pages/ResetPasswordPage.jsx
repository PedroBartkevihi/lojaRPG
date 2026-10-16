import { useState } from 'react';
import { KeyRound } from 'lucide-react';

const MISSING_TOKEN_MESSAGE = 'Link incompleto. Abra o link do e-mail de novo ou peça outro na tela de entrada.';

// O token chega no fragmento do link (#token=...), que nao vai para o
// servidor do site. Ele sai da barra de endereco assim que a tela o le, para
// nao ficar no historico nem num print.
function readTokenFromHash() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';

  if (token) {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }

  return token;
}

export default function ResetPasswordPage({ api, onDone }) {
  const [token] = useState(readTokenFromHash);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(() => (token ? '' : MISSING_TOKEN_MESSAGE));
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (password !== confirmation) {
      setError('As duas senhas não são iguais.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await api.resetPassword({ token, password });
      setDone(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="stack-form">
        <h2>Senha nova criada</h2>
        <p className="form-hint" role="status">
          {done} As sessões abertas em outros aparelhos foram encerradas.
        </p>
        <button type="button" className="primary-action" onClick={onDone}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <h2>Criar senha nova</h2>
      <label>
        Senha nova
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          aria-describedby="reset-password-hint"
          required
          disabled={!token}
        />
      </label>
      <label>
        Repita a senha nova
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          type="password"
          autoComplete="new-password"
          required
          disabled={!token}
        />
      </label>
      <p id="reset-password-hint" className="form-hint">
        Pelo menos 8 caracteres. Senhas muito comuns, como 12345678 ou senha123, são recusadas.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-action" disabled={loading || !token}>
        <KeyRound size={18} />
        {loading ? 'Salvando...' : 'Salvar senha nova'}
      </button>
      <button type="button" className="text-action" onClick={onDone}>
        Voltar para a entrada
      </button>
    </form>
  );
}
