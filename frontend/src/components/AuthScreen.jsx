import { Coins, RefreshCcw, Store, Users } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import DemoLogin, { DEMO_LOGIN_ENABLED } from './DemoLogin.jsx';
import { readPendingInvite } from '../hooks/usePendingInvite.js';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx';

export const RESET_PATH = '/redefinir-senha';
const AUTH_PATHS = ['/login', '/register', '/esqueci-senha', RESET_PATH];

// Tela de entrada: login, cadastro, senha esquecida e senha nova, com a
// apresentacao da loja e os botoes da demonstracao.
export default function AuthScreen({ api, loggedIn, inviteCode, onLogin, onPasswordReset }) {
  const location = useLocation();
  const navigate = useNavigate();
  const onResetPage = location.pathname === RESET_PATH;
  // Quem chegou por um convite precisa de conta propria: a de demonstracao
  // nao entra em outras mesas, entao os botoes dela somem dessa tela.
  const hasPendingInvite = Boolean(inviteCode || readPendingInvite());
  // Sem sessao, o endereco e sempre o de uma tela de entrada: uma navegacao
  // da area logada que chegue depois do logout (ex.: /shop) volta para /login.
  const onAuthPath = AUTH_PATHS.includes(location.pathname) || Boolean(inviteCode);

  return (
    <main className="auth-screen">
      {!onAuthPath && !loggedIn && <Navigate to="/login" replace />}
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="brand-lockup">
            <Store size={34} />
            <div>
              <p className="eyebrow">Campanhas compartilhadas</p>
              <h1>lojaRPG</h1>
            </div>
          </div>
          <h2>A loja da sua campanha de RPG</h2>
          <p>
            O Mestre monta o catálogo e distribui o ouro; os jogadores compram, vendem e usam itens com os
            personagens da mesa, cada um no próprio celular.
          </p>
          <ul className="feature-list">
            <li>
              <Users size={18} />
              Mesas com convite por link
            </li>
            <li>
              <Coins size={18} />
              Compra, venda e recompensas em ouro
            </li>
            <li>
              <RefreshCcw size={18} />
              Telas que se atualizam durante a sessão
            </li>
          </ul>
          {DEMO_LOGIN_ENABLED && !hasPendingInvite && <DemoLogin api={api} onLogin={onLogin} />}
        </section>
        <section className="auth-panel">
          {hasPendingInvite && (
            <p className="form-hint auth-hint">Entre ou crie sua conta para participar da mesa do convite.</p>
          )}
          {onResetPage ? (
            <ResetPasswordPage api={api} onDone={onPasswordReset} />
          ) : location.pathname === '/esqueci-senha' ? (
            <ForgotPasswordPage api={api} onBack={() => navigate('/login')} />
          ) : location.pathname === '/register' ? (
            <RegisterPage api={api} onRegister={onLogin} onSwitch={() => navigate('/login')} />
          ) : (
            <LoginPage
              api={api}
              onLogin={onLogin}
              onSwitch={() => navigate('/register')}
              onForgot={() => navigate('/esqueci-senha')}
            />
          )}
        </section>
      </div>
    </main>
  );
}
