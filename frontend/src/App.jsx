import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Coins,
  Crown,
  History,
  LogOut,
  Package,
  RefreshCcw,
  ScrollText,
  Shield,
  Store,
  Users
} from 'lucide-react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  matchPath,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom';
import { createApi } from './js/api.js';
import DemoLogin, { DEMO_LOGIN_ENABLED } from './components/DemoLogin.jsx';
import { SkeletonCards } from './components/Skeleton.jsx';
import { useLiveTick } from './js/useLiveTick.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';
import CampaignPage from './pages/CampaignPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import InventoryPanel from './components/InventoryPanel.jsx';
import PurchaseHistory from './components/PurchaseHistory.jsx';

const TOKEN_KEY = 'lojaRpgToken';
const REFRESH_TOKEN_KEY = 'lojaRpgRefreshToken';
const USER_KEY = 'lojaRpgUser';
const CAMPAIGN_KEY = 'lojaRpgCampaign';
const INVITE_KEY = 'lojaRpgInvite';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch (_error) {
    return null;
  }
}

function readStoredCampaignId() {
  return Number(localStorage.getItem(CAMPAIGN_KEY)) || null;
}

// Entra na mesa do link de convite assim que existe uma sessao.
function InviteRoute({ onJoin }) {
  const { code } = useParams();
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      onJoin(code);
    }
  }, [code, onJoin]);

  return <p className="empty-state">Entrando na mesa...</p>;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [campaignId, setCampaignId] = useState(readStoredCampaignId);
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [notice, setNotice] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  const inviteCode = matchPath('/convite/:code', location.pathname)?.params.code;
  // A renovacao do token troca o valor dele; as cargas abaixo so dependem de
  // haver sessao, para nao recarregar tudo a cada renovacao.
  const loggedIn = Boolean(token);
  const liveTick = useLiveTick(loggedIn);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CAMPAIGN_KEY);
    setToken(null);
    setUser(null);
    setCampaigns([]);
    setCampaignsLoaded(false);
    setCampaignId(null);
    setCharacters([]);
    setSelectedCharacterId(null);
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
  }, []);

  const api = useMemo(
    () =>
      createApi(
        () => localStorage.getItem(TOKEN_KEY),
        clearSession,
        () => localStorage.getItem(REFRESH_TOKEN_KEY),
        storeTokens,
        () => localStorage.getItem(CAMPAIGN_KEY)
      ),
    [clearSession, storeTokens]
  );

  const loadCampaigns = useCallback(async () => {
    const data = await api.listCampaigns();
    setCampaigns(data.campaigns);
    setCampaignsLoaded(true);
    return data.campaigns;
  }, [api]);

  // Recarrega os personagens do usuario na mesa ativa (ouro, nivel etc.).
  const refreshSession = useCallback(async () => {
    if (!localStorage.getItem(CAMPAIGN_KEY)) {
      return;
    }

    const data = await api.myCharacter();
    const nextCharacters = data.characters || [];
    setCharacters(nextCharacters);
    setSelectedCharacterId((current) =>
      current && nextCharacters.some((entry) => entry.id === current) ? current : nextCharacters[0]?.id || null
    );
    setRefreshCount((value) => value + 1);
  }, [api]);

  const selectCampaign = useCallback(
    (nextCampaign, path = '/shop', options = {}) => {
      localStorage.setItem(CAMPAIGN_KEY, String(nextCampaign.id));
      setCampaignId(nextCampaign.id);
      navigate(path, options);
    },
    [navigate]
  );

  // A lista e atualizada antes de soltar a mesa; com a lista antiga, a selecao
  // automatica abriria de novo a mesa que acabou de sair.
  const leaveCampaign = useCallback(async () => {
    await loadCampaigns();
    localStorage.removeItem(CAMPAIGN_KEY);
    setCampaignId(null);
    navigate('/mesas', { replace: true });
  }, [loadCampaigns, navigate]);

  const joinWithCode = useCallback(
    async (code) => {
      try {
        const data = await api.joinCampaign({ inviteCode: code });
        await loadCampaigns();
        showNotice(data.message);
        selectCampaign(data.campaign, '/shop', { replace: true });
      } catch (error) {
        showNotice(error.message);
        navigate('/mesas', { replace: true });
      }
    },
    [api, loadCampaigns, navigate, selectCampaign, showNotice]
  );

  useEffect(() => {
    if (loggedIn) {
      loadCampaigns().catch((error) => showNotice(error.message));
    }
  }, [loggedIn, loadCampaigns, showNotice]);

  useEffect(() => {
    setCharacters([]);
    setSelectedCharacterId(null);

    if (loggedIn && campaignId) {
      refreshSession().catch((error) => showNotice(error.message));
    }
  }, [loggedIn, campaignId, refreshSession, showNotice]);

  // A cada batida, recarrega as mesas (alguem pode ter sido removido) e os
  // personagens; a atualizacao da sessao tambem recarrega inventario e compras.
  // Falhas aqui ficam quietas para nao encher a tela de avisos.
  useEffect(() => {
    if (liveTick > 0) {
      loadCampaigns().catch(() => {});
      refreshSession().catch(() => {});
    }
  }, [liveTick, loadCampaigns, refreshSession]);

  const campaign = campaigns.find((entry) => entry.id === campaignId) || null;

  // Esquece a mesa guardada se a pessoa saiu ou foi removida dela, e abre
  // direto a unica mesa de quem so participa de uma.
  useEffect(() => {
    if (!campaignsLoaded) {
      return;
    }

    if (campaignId && !campaign) {
      localStorage.removeItem(CAMPAIGN_KEY);
      setCampaignId(null);
    } else if (!campaignId && campaigns.length === 1) {
      localStorage.setItem(CAMPAIGN_KEY, String(campaigns[0].id));
      setCampaignId(campaigns[0].id);
    }
  }, [campaignsLoaded, campaignId, campaign, campaigns]);

  // Quem abre um link de convite sem estar logado entra na mesa depois do login.
  useEffect(() => {
    if (!token && inviteCode) {
      localStorage.setItem(INVITE_KEY, inviteCode);
    }
  }, [token, inviteCode]);

  const saveSession = useCallback(
    (data) => {
      storeTokens(data);
      showNotice(`Bem-vindo, ${data.user.name}.`);
      const pendingInvite = localStorage.getItem(INVITE_KEY);
      localStorage.removeItem(INVITE_KEY);
      navigate(pendingInvite ? `/convite/${pendingInvite}` : '/shop', { replace: true });
    },
    [navigate, showNotice, storeTokens]
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

  if (!token || !user) {
    const isRegisterRoute = location.pathname === '/register';

    return (
      <main className="auth-screen">
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
            {DEMO_LOGIN_ENABLED && <DemoLogin api={api} onLogin={saveSession} />}
          </section>
          <section className="auth-panel">
            {(inviteCode || localStorage.getItem(INVITE_KEY)) && (
              <p className="form-hint auth-hint">Entre ou crie sua conta para participar da mesa do convite.</p>
            )}
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
        </div>
      </main>
    );
  }

  const isMaster = campaign?.role === 'MESTRE';
  const selectedCharacter = characters.find((entry) => entry.id === selectedCharacterId) || characters[0] || null;
  const activeRoute = location.pathname.split('/')[1] || 'shop';
  const showTabs = Boolean(campaign) && activeRoute !== 'mesas' && activeRoute !== 'convite';
  const autoSelecting = campaignsLoaded && !campaignId && campaigns.length === 1;

  // As paginas da loja so existem dentro de uma mesa; a chave remonta a
  // pagina ao trocar de mesa, para ela buscar os dados da mesa nova.
  function inCampaign(element) {
    if (!campaignsLoaded || autoSelecting) {
      return (
        <div className="wide-section">
          <SkeletonCards count={6} />
        </div>
      );
    }

    return campaign ? <Fragment key={campaign.id}>{element}</Fragment> : <Navigate to="/mesas" replace />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup small">
          <Store size={28} />
          <div>
            <p className="eyebrow">{showTabs ? campaign.name : 'Mesas de aventura'}</p>
            <h1>lojaRPG</h1>
          </div>
        </div>
        {showTabs ? (
          <nav className="tabs" aria-label="Navegação principal">
            <button className={activeRoute === 'shop' ? 'active' : ''} onClick={() => navigate('/shop')}>
              <Store size={18} />
              Loja
            </button>
            {!isMaster && (
              <button className={activeRoute === 'inventory' ? 'active' : ''} onClick={() => navigate('/inventory')}>
                <Package size={18} />
                Inventário
              </button>
            )}
            <button className={activeRoute === 'history' ? 'active' : ''} onClick={() => navigate('/history')}>
              <History size={18} />
              Compras
            </button>
            <button className={activeRoute === 'mesa' ? 'active' : ''} onClick={() => navigate('/mesa')}>
              <Users size={18} />
              Mesa
            </button>
            {isMaster && (
              <button className={activeRoute === 'admin' ? 'active' : ''} onClick={() => navigate('/admin')}>
                <Crown size={18} />
                Mestre
              </button>
            )}
          </nav>
        ) : (
          <span className="tabs-placeholder" />
        )}
        <div className="session-pill">
          {showTabs && (
            <button className="icon-button" onClick={() => navigate('/mesas')} title="Trocar de mesa">
              <ArrowLeftRight size={18} />
            </button>
          )}
          {showTabs && isMaster ? <Shield size={18} /> : <ScrollText size={18} />}
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
          path="/mesas"
          element={
            <CampaignsPage
              api={api}
              campaigns={campaigns}
              loadingCampaigns={!campaignsLoaded}
              activeCampaignId={campaign?.id}
              onSelect={selectCampaign}
              onCampaignsChanged={loadCampaigns}
              showNotice={showNotice}
            />
          }
        />
        <Route path="/convite/:code" element={<InviteRoute onJoin={joinWithCode} />} />
        <Route
          path="/shop"
          element={inCampaign(
            <ShopPage
              api={api}
              liveKey={liveTick}
              isMaster={isMaster}
              character={selectedCharacter}
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onRefreshSession={refreshSession}
              showNotice={showNotice}
            />
          )}
        />
        <Route
          path="/inventory"
          element={inCampaign(
            isMaster ? (
              <Navigate to="/shop" replace />
            ) : (
              <InventoryPanel
                api={api}
                character={selectedCharacter}
                refreshKey={refreshCount}
                showNotice={showNotice}
                onRefreshSession={refreshSession}
              />
            )
          )}
        />
        <Route
          path="/history"
          element={inCampaign(
            <PurchaseHistory api={api} isMaster={isMaster} character={selectedCharacter} refreshKey={refreshCount} />
          )}
        />
        <Route
          path="/mesa"
          element={inCampaign(
            <CampaignPage
              api={api}
              liveKey={liveTick}
              campaign={campaign}
              user={user}
              showNotice={showNotice}
              onCampaignsChanged={loadCampaigns}
              onLeave={leaveCampaign}
            />
          )}
        />
        <Route
          path="/admin"
          element={inCampaign(
            isMaster ? (
              <AdminPage api={api} liveKey={liveTick} showNotice={showNotice} onRefresh={refreshSession} />
            ) : (
              <Navigate to="/shop" replace />
            )
          )}
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
