import { useState } from 'react';
import { Crown, ScrollText } from 'lucide-react';
import { SLOW_API_MESSAGE, useSlowHint } from '../js/useSlowHint.js';

// As contas da mesa de demonstracao sao publicas (estao no README). Uma
// instalacao sem a demonstracao esconde os botoes com VITE_DEMO_LOGIN=false.
export const DEMO_LOGIN_ENABLED = import.meta.env.VITE_DEMO_LOGIN !== 'false';

const DEMO_ACCOUNTS = [
  {
    key: 'player',
    label: 'Entrar como jogador',
    detail: 'Aria Luaferro, a ladina do grupo',
    email: 'aria@lojarpg.local',
    password: 'jogador123',
    Icon: ScrollText
  },
  {
    key: 'master',
    label: 'Entrar como Mestre',
    detail: 'Catálogo, ouro e recompensas',
    email: 'mestre@lojarpg.local',
    password: 'mestre123',
    Icon: Crown
  }
];

export default function DemoLogin({ api, onLogin }) {
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const slow = useSlowHint(Boolean(pending));

  async function enter(account) {
    setPending(account.key);
    setError('');

    try {
      onLogin(await api.login({ email: account.email, password: account.password }));
    } catch (requestError) {
      setError(requestError.message);
      setPending('');
    }
  }

  return (
    <div className="demo-login">
      <p className="fieldset-title">Experimente sem criar conta</p>
      <div className="demo-buttons">
        {DEMO_ACCOUNTS.map(({ key, label, detail, Icon, ...account }) => (
          <button
            key={key}
            type="button"
            className="demo-button"
            disabled={Boolean(pending)}
            onClick={() => enter({ key, ...account })}
          >
            <Icon size={22} />
            <strong>{pending === key ? 'Entrando...' : label}</strong>
            <span>{detail}</span>
          </button>
        ))}
      </div>
      <p className="form-hint">A mesa de demonstração volta ao estado inicial de tempos em tempos.</p>
      {slow && <p className="form-hint slow-hint">{SLOW_API_MESSAGE}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
