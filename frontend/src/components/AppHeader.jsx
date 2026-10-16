import { ArrowLeftRight, Crown, History, LogOut, Package, ScrollText, Shield, Store, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveCampaignContext } from '../hooks/ActiveCampaignContext.js';

// Topo do app com a mesa ativa, as abas e a sessao. Le a mesa do contexto.
export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campaign, isMaster, user, onLogout } = useActiveCampaignContext();
  const activeRoute = location.pathname.split('/')[1] || 'shop';
  const showTabs = Boolean(campaign) && activeRoute !== 'mesas' && activeRoute !== 'convite';

  const tab = (route, label, Icon) => (
    <button className={activeRoute === route ? 'active' : ''} onClick={() => navigate(`/${route}`)}>
      <Icon size={18} />
      {label}
    </button>
  );

  return (
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
          {tab('shop', 'Loja', Store)}
          {!isMaster && tab('inventory', 'Inventário', Package)}
          {tab('history', 'Compras', History)}
          {tab('sessions', 'Diário', ScrollText)}
          {tab('mesa', 'Mesa', Users)}
          {isMaster && tab('admin', 'Mestre', Crown)}
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
        <button className="icon-button" onClick={onLogout} title="Sair">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
