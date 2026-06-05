import { useCallback, useMemo, useState } from 'react';
import { Crown, History, LogOut, Package, ScrollText, Shield, Store } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { createApi } from './js/api.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import InventoryPanel from './components/InventoryPanel.jsx';
import PurchaseHistory from './components/PurchaseHistory.jsx';

const TOKEN_KEY = 'lojaRpgToken';
const REFRESH_TOKEN_KEY = 'lojaRpgRefreshToken';
const USER_KEY = 'lojaRpgUser';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch (_error) {
    return null;
  }
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [character, setCharacter] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [activeTab, setActiveTab] = useState('shop');
  const [notice, setNotice] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setCharacter(null);
    setCharacters([]);
    setSelectedCharacterId(null);
    setActiveTab('shop');
    navigate('/login', { replace: true });
  }, [navigate]);

  const storeTokens = useCallback((data) => {
    const accessToken = data.accessToken || data.token;

    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
    }

    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }

    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
    }

    if ('character' in data) {
      setCharacter(data.character || null);
    }

    if ('characters' in data) {
      const nextCharacters = data.characters || [];
      setCharacters(nextCharacters);
      setSelectedCharacterId((current) => {
        if (current && nextCharacters.some((entry) => entry.id === current)) {
          return current;
        }

        return data.character?.id || nextCharacters[0]?.id || null;
      });
    }
  }, []);

  const api = useMemo(
    () =>
      createApi(
        () => localStorage.getItem(TOKEN_KEY),
        clearSession,
        () => localStorage.getItem(REFRESH_TOKEN_KEY),
        storeTokens
      ),
    [clearSession, storeTokens]
  );

  const refreshSession = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return;
    }

    const data = await api.me();
    setUser(data.user);
    setCharacter(data.character);
    setCharacters(data.characters || (data.character ? [data.character] : []));
    setSelectedCharacterId((current) => current || data.character?.id || data.characters?.[0]?.id || null);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setRefreshCount((value) => value + 1);
  }, [api]);

  const saveSession = useCallback(
    (data) => {
      storeTokens(data);
      setNotice(`Bem-vindo, ${data.user.name}.`);
      refreshSession();
      navigate('/shop', { replace: true });
    },
    [navigate, refreshSession, storeTokens]
  );

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await api.logout({ refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) });
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
    const isRegisterRoute = location.pathname === '/register';

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
          {isRegisterRoute || authView === 'register' ? (
            <RegisterPage
              api={api}
              onRegister={saveSession}
              onSwitch={() => {
                setAuthView('login');
                navigate('/login');
              }}
            />
          ) : (
            <LoginPage
              api={api}
              onLogin={saveSession}
              onSwitch={() => {
                setAuthView('register');
                navigate('/register');
              }}
            />
          )}
        </section>
      </main>
    );
  }

  const isMaster = user.role === 'MESTRE';
  const selectedCharacter = characters.find((entry) => entry.id === selectedCharacterId) || character;
  const activeRoute = location.pathname.replace('/', '') || 'shop';

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
          <button className={activeRoute === 'shop' ? 'active' : ''} onClick={() => navigate('/shop')}>
            <Store size={18} />
            Loja
          </button>
          {!isMaster && (
            <button className={activeRoute === 'inventory' ? 'active' : ''} onClick={() => navigate('/inventory')}>
              <Package size={18} />
              Inventario
            </button>
          )}
          <button className={activeRoute === 'history' ? 'active' : ''} onClick={() => navigate('/history')}>
            <History size={18} />
            Compras
          </button>
          {isMaster && (
            <button className={activeRoute === 'admin' ? 'active' : ''} onClick={() => navigate('/admin')}>
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

      <Routes>
        <Route path="/" element={<Navigate to="/shop" replace />} />
        <Route
          path="/shop"
          element={
            <ShopPage
              api={api}
              user={user}
              character={selectedCharacter}
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onRefreshSession={refreshSession}
              showNotice={showNotice}
            />
          }
        />
        <Route
          path="/inventory"
          element={
            isMaster ? (
              <Navigate to="/shop" replace />
            ) : (
              <InventoryPanel api={api} character={selectedCharacter} refreshKey={refreshCount} showNotice={showNotice} />
            )
          }
        />
        <Route
          path="/history"
          element={<PurchaseHistory api={api} isMaster={isMaster} character={selectedCharacter} refreshKey={refreshCount} />}
        />
        <Route
          path="/admin"
          element={isMaster ? <AdminPage api={api} showNotice={showNotice} onRefresh={refreshSession} /> : <Navigate to="/shop" replace />}
        />
        <Route path="*" element={<Navigate to="/shop" replace />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
