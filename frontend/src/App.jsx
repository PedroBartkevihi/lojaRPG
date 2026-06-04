import { useCallback, useMemo, useState } from 'react';
import { Crown, History, LogOut, Package, ScrollText, Shield, Store } from 'lucide-react';
import { createApi } from './js/api.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import InventoryPanel from './components/InventoryPanel.jsx';
import PurchaseHistory from './components/PurchaseHistory.jsx';

const TOKEN_KEY = 'lojaRpgToken';
const USER_KEY = 'lojaRpgUser';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch (_error) {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [character, setCharacter] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [activeTab, setActiveTab] = useState('shop');
  const [notice, setNotice] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setCharacter(null);
    setActiveTab('shop');
  }, []);

  const api = useMemo(() => createApi(() => localStorage.getItem(TOKEN_KEY), clearSession), [clearSession]);

  const refreshSession = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return;
    }

    const data = await api.me();
    setUser(data.user);
    setCharacter(data.character);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setRefreshCount((value) => value + 1);
  }, [api]);

  const saveSession = useCallback(
    (data) => {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setCharacter(data.character || null);
      setNotice(`Bem-vindo, ${data.user.name}.`);
      refreshSession();
    },
    [refreshSession]
  );

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await api.logout();
      }
    } catch (_error) {
      // O token sera removido localmente mesmo se ja estiver expirado.
    } finally {
      clearSession();
    }
  }, [api, clearSession, token]);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }, []);

  if (!token || !user) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <div className="brand-lockup">
            <Store size={34} />
            <div>
              <p className="eyebrow">Campanhas compartilhadas</p>
              <h1>lojaRPG</h1>
            </div>
          </div>
          {authView === 'login' ? (
            <LoginPage api={api} onLogin={saveSession} onSwitch={() => setAuthView('register')} />
          ) : (
            <RegisterPage api={api} onRegister={saveSession} onSwitch={() => setAuthView('login')} />
          )}
        </section>
      </main>
    );
  }

  const isMaster = user.role === 'MESTRE';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup small">
          <Store size={28} />
          <div>
            <p className="eyebrow">Mesa de aventura</p>
            <h1>lojaRPG</h1>
          </div>
        </div>
        <nav className="tabs" aria-label="Navegacao principal">
          <button className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>
            <Store size={18} />
            Loja
          </button>
          {!isMaster && (
            <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>
              <Package size={18} />
              Inventario
            </button>
          )}
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
            <History size={18} />
            Compras
          </button>
          {isMaster && (
            <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>
              <Crown size={18} />
              Mestre
            </button>
          )}
        </nav>
        <div className="session-pill">
          {isMaster ? <Shield size={18} /> : <ScrollText size={18} />}
          <span>{user.name}</span>
          <button className="icon-button" onClick={handleLogout} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      {activeTab === 'shop' && (
        <ShopPage
          api={api}
          user={user}
          character={character}
          onRefreshSession={refreshSession}
          showNotice={showNotice}
        />
      )}
      {activeTab === 'inventory' && (
        <InventoryPanel api={api} refreshKey={refreshCount} showNotice={showNotice} />
      )}
      {activeTab === 'history' && (
        <PurchaseHistory api={api} isMaster={isMaster} refreshKey={refreshCount} />
      )}
      {activeTab === 'admin' && isMaster && (
        <AdminPage api={api} showNotice={showNotice} onRefresh={refreshSession} />
      )}
    </main>
  );
}
