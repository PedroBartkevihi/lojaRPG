import { Fragment, useCallback, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, matchPath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createApi } from './js/api.js';
import { useLiveTick } from './js/useLiveTick.js';
import { useNotice } from './js/useNotice.js';
import { ActiveCampaignContext } from './hooks/ActiveCampaignContext.js';
import { readStoredCampaignId, useActiveCampaign } from './hooks/useActiveCampaign.js';
import { clearPendingInvite, landingPath, usePendingInvite } from './hooks/usePendingInvite.js';
import { readRefreshToken, readToken, useSession } from './hooks/useSession.js';
import AppHeader from './components/AppHeader.jsx';
import AuthScreen, { RESET_PATH } from './components/AuthScreen.jsx';
import { SkeletonCards } from './components/Skeleton.jsx';
import InventoryPanel from './components/InventoryPanel.jsx';
import PurchaseHistory from './components/PurchaseHistory.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';
import CampaignPage from './pages/CampaignPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SessionDiary from './pages/SessionDiary.jsx';

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
  const [notice, showNotice] = useNotice();
  const { token, user, loggedIn, storeTokens, forgetSession } = useSession();

  const inviteCode = matchPath('/convite/:code', location.pathname)?.params.code;
  // A renovacao do token troca o valor dele; as cargas so dependem de haver
  // sessao, para nao recarregar tudo a cada renovacao.
  const liveTick = useLiveTick(loggedIn);
  usePendingInvite(loggedIn, inviteCode);

  // O navigate do React Router muda a cada troca de pagina. Guardado num ref,
  // ele nao recria a API a cada navegacao; com uma API so, as requisicoes
  // dividem a mesma renovacao de sessao e as cargas nao se repetem.
  const navigateRef = useRef(navigate);
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    navigateRef.current = navigate;
    pathnameRef.current = location.pathname;
  }, [navigate, location.pathname]);

  // A API le a mesa deste ref (veja useActiveCampaign) e chama `onUnauthorized`
  // quando a sessao e recusada; o ref deixa a API ser criada antes do hook da
  // mesa, que precisa dela.
  const campaignIdRef = useRef(readStoredCampaignId());
  const unauthorizedRef = useRef(() => {});

  const api = useMemo(
    () => createApi(readToken, () => unauthorizedRef.current(), readRefreshToken, storeTokens, () => campaignIdRef.current),
    [storeTokens]
  );

  const active = useActiveCampaign({ api, campaignIdRef, loggedIn, liveTick, showNotice });
  const { campaign, isMaster, loadCampaigns, refreshSession, setActiveCampaign, reset } = active;

  const clearSession = useCallback(() => {
    forgetSession();
    reset();

    // A tela de senha nova fica aberta quando a sessao do aparelho acaba no
    // meio (sessao vencida ou a propria troca de senha): o token do link ja
    // saiu da barra de endereco e se perderia.
    if (pathnameRef.current !== RESET_PATH) {
      navigateRef.current('/login', { replace: true });
    }
  }, [forgetSession, reset]);

  useEffect(() => {
    unauthorizedRef.current = clearSession;
  }, [clearSession]);

  const selectCampaign = useCallback(
    (nextCampaign, path = '/shop', options = {}) => {
      setActiveCampaign(nextCampaign.id);
      navigate(path, options);
    },
    [navigate, setActiveCampaign]
  );

  // A lista e atualizada antes de soltar a mesa; com a lista antiga, a selecao
  // automatica abriria de novo a mesa que acabou de sair.
  const leaveCampaign = useCallback(async () => {
    await loadCampaigns();
    setActiveCampaign(null);
    navigate('/mesas', { replace: true });
  }, [loadCampaigns, navigate, setActiveCampaign]);

  const joinWithCode = useCallback(
    async (code) => {
      clearPendingInvite();

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

  const saveSession = useCallback(
    (data) => {
      storeTokens(data);
      showNotice(`Bem-vindo, ${data.user.name}.`);
      navigate(landingPath(), { replace: true });
    },
    [navigate, showNotice, storeTokens]
  );

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await api.logout({ refreshToken: readRefreshToken() });
      }
    } catch (_error) {
      // O token sera removido localmente mesmo se ja estiver expirado.
    } finally {
      clearSession();
    }
  }, [api, clearSession, token]);

  // Depois da senha nova, a sessao deste aparelho (se havia) tambem sai.
  const finishPasswordReset = useCallback(async () => {
    if (token) {
      await handleLogout();
    }

    navigate('/login', { replace: true });
  }, [handleLogout, navigate, token]);

  const header = useMemo(() => ({ campaign, isMaster, user, onLogout: handleLogout }), [campaign, isMaster, user, handleLogout]);

  // A tela de senha nova e a mesma com ou sem sessao no aparelho: assim ela
  // nao e remontada (perdendo o token do link) quando a sessao acaba.
  if (!token || !user || location.pathname === RESET_PATH) {
    return (
      <AuthScreen
        api={api}
        loggedIn={Boolean(token && user)}
        inviteCode={inviteCode}
        onLogin={saveSession}
        onPasswordReset={finishPasswordReset}
      />
    );
  }

  const { campaigns, campaignsLoaded, characters, selectedCharacter, selectedCharacterId, setSelectedCharacterId } = active;

  // As paginas da loja so existem dentro de uma mesa; a chave remonta a
  // pagina ao trocar de mesa, para ela buscar os dados da mesa nova.
  function inCampaign(element) {
    if (!campaignsLoaded || active.autoSelecting) {
      return (
        <div className="wide-section">
          <SkeletonCards count={6} />
        </div>
      );
    }

    return campaign ? <Fragment key={campaign.id}>{element}</Fragment> : <Navigate to="/mesas" replace />;
  }

  return (
    <ActiveCampaignContext.Provider value={header}>
      <main className="app-shell">
        <AppHeader />

        {/* Regiao viva: leitores de tela anunciam o aviso sem mudar o foco. */}
        <div className="toast-region" role="status" aria-live="polite">
          {notice && <div className="toast">{notice}</div>}
        </div>

        <Routes>
          <Route path="/" element={<Navigate to="/shop" replace />} />
          <Route path="/login" element={<Navigate to={landingPath()} replace />} />
          <Route path="/register" element={<Navigate to={landingPath()} replace />} />
          <Route
            path="/mesas"
            element={
              <CampaignsPage
                api={api}
                campaigns={campaigns}
                loadingCampaigns={!campaignsLoaded}
                activeCampaignId={campaign?.id}
                isDemo={Boolean(user.isDemo)}
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
                  needsCharacter={active.needsCharacter}
                  refreshKey={active.refreshCount}
                  showNotice={showNotice}
                  onRefreshSession={refreshSession}
                />
              )
            )}
          />
          <Route
            path="/history"
            element={inCampaign(
              <PurchaseHistory
                api={api}
                isMaster={isMaster}
                character={selectedCharacter}
                needsCharacter={active.needsCharacter}
                refreshKey={active.refreshCount}
              />
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
                <AdminPage
                  api={api}
                  campaign={campaign}
                  onCampaignsChanged={loadCampaigns}
                  liveKey={liveTick}
                  showNotice={showNotice}
                  onRefresh={refreshSession}
                />
              ) : (
                <Navigate to="/shop" replace />
              )
            )}
          />
          <Route
            path="/sessions"
            element={inCampaign(<SessionDiary api={api} isMaster={isMaster} liveKey={liveTick} showNotice={showNotice} />)}
          />
          <Route path="*" element={<Navigate to="/shop" replace />} />
        </Routes>
      </main>
    </ActiveCampaignContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
