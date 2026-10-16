import { useState } from 'react';
import { MailQuestion } from 'lucide-react';
import { SLOW_API_MESSAGE, useSlowHint } from '../js/useSlowHint.js';

// Pede o link de senha nova. A resposta e a mesma exista o e-mail ou nao, para
// a tela nao revelar quem tem conta.
export default function ForgotPasswordPage({ api, onBack }) {
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const slow = useSlowHint(loading);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.forgotPassword({ email });
      setSentMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <h2>Esqueci minha senha</h2>
      {sentMessage ? (
        <p className="form-hint" role="status">
          {sentMessage} Confira também a caixa de spam.
        </p>
      ) : (
        <>
          <p className="form-hint">Informe o e-mail da conta. Enviamos um link para você criar uma senha nova.</p>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          {slow && <p className="form-hint slow-hint">{SLOW_API_MESSAGE}</p>}
          {error && <p className="form-error">{error}</p>}
          <button className="primary-action" disabled={loading}>
            <MailQuestion size={18} />
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </>
      )}
      <button type="button" className="text-action" onClick={onBack}>
        Voltar para a entrada
      </button>
    </form>
  );
}
