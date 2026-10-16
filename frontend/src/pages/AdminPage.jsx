import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coins, History, PackagePlus, RefreshCcw, ScrollText, Tags } from 'lucide-react';
import CatalogTab from '../components/admin/CatalogTab.jsx';
import HistoryTab from '../components/admin/HistoryTab.jsx';
import ItemsTab from '../components/admin/ItemsTab.jsx';
import MasterGuide, { markCatalogReviewed } from '../components/admin/MasterGuide.jsx';
import PartyTab from '../components/admin/PartyTab.jsx';
import RequestsTab from '../components/admin/RequestsTab.jsx';
import ShopsTab from '../components/admin/ShopsTab.jsx';
import DiscountsPanel from '../components/admin/DiscountsPanel.jsx';

// A aba fica no endereco (?aba=itens) para sobreviver a um recarregamento.
const TABS = [
  { key: 'grupo', label: 'Grupo e moedas', Icon: Coins },
  { key: 'vendedores', label: 'Vendedores', Icon: Tags },
  { key: 'itens', label: 'Itens', Icon: PackagePlus },
  { key: 'catalogo', label: 'Catálogo', Icon: Tags },
  { key: 'encomendas', label: 'Encomendas', Icon: ScrollText },
  { key: 'historicos', label: 'Históricos', Icon: History }
];

export default function AdminPage({ api, campaign, liveKey, showNotice, onRefresh }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyVersion, setHistoryVersion] = useState(0);
  const requestVersion = useRef(0);
  const loadedTab = useRef(null);
  const lastLiveKey = useRef(liveKey);

  const activeTab = TABS.some((tab) => tab.key === searchParams.get('aba')) ? searchParams.get('aba') : 'grupo';

  // `silent` e a recarga automatica e a que vem depois de uma acao: a tela
  // atual fica ate os dados novos chegarem, sem "Carregando".
  const loadAdminData = useCallback(async ({ silent = false } = {}) => {
    const request = ++requestVersion.current;
    if (!silent) {
      setLoading(true);
    }

    try {
      const sources = {
        grupo: [() => api.listItems({ includeInactive: true }), () => api.listCharacters()],
        vendedores: [() => api.listShops(), () => api.listDiscounts(), () => api.listCategories(), () => api.listCharacters()],
        itens: [() => api.listShops(), () => api.listItems({ includeInactive: true }), () => api.listCategories(), () => api.listRarities()],
        catalogo: [() => api.listCategories(), () => api.listRarities()],
        encomendas: [
          () => api.listItemRequests(),
          () => api.listItems({ includeInactive: true }),
          () => api.listCategories(),
          () => api.listRarities()
        ],
        historicos: []
      };
      const data = Object.assign({}, ...await Promise.all(sources[activeTab].map((load) => load())));
      if (request !== requestVersion.current) return;
      if (data.shops) setShops(data.shops);
      if (data.items) setItems(data.items);
      if (data.characters) setCharacters(data.characters);
      if (data.categories) setCategories(data.categories);
      if (data.rarities) setRarities(data.rarities);
      if (data.requests) setRequests(data.requests);
      if (data.discounts) setDiscounts(data.discounts);
      loadedTab.current = activeTab;
    } catch (error) {
      if (request === requestVersion.current) throw error;
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [api, activeTab]);

  const reload = useCallback(() => loadAdminData({ silent: true }), [loadAdminData]);

  useEffect(() => {
    if (activeTab === 'itens' || activeTab === 'catalogo') {
      markCatalogReviewed(campaign?.id);
    }
  }, [activeTab, campaign?.id]);

  // So a abertura da aba avisa do erro. Na batida de 10 s, com a API dormindo
  // ou fora do ar, o aviso se repetiria a cada batida; a proxima tenta de novo.
  useEffect(() => {
    const polling = lastLiveKey.current !== liveKey;
    lastLiveKey.current = liveKey;
    loadAdminData({ silent: loadedTab.current === activeTab }).catch((error) => {
      if (!polling) showNotice(error.message);
    });
    return () => { requestVersion.current += 1; };
  }, [loadAdminData, showNotice, liveKey, activeTab]);

  return (
    <section className="wide-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Controle do Mestre</p>
          <h2>Painel do Mestre</h2>
        </div>
        <button className="secondary-action" onClick={() => activeTab === 'historicos'
          ? setHistoryVersion((value) => value + 1)
          : loadAdminData().catch((error) => showNotice(error.message))}>
          <RefreshCcw size={17} />
          Atualizar
        </button>
      </div>

      <nav className="subtabs" role="tablist" aria-label="Seções do painel do Mestre">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={activeTab === key ? 'active' : ''}
            onClick={() => setSearchParams({ aba: key }, { replace: true })}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'grupo' && !loading && (
        <MasterGuide
          campaign={campaign}
          items={items}
          characters={characters}
          onNavigate={(target) => (target === 'mesa' ? navigate('/mesa') : setSearchParams({ aba: target }, { replace: true }))}
        />
      )}
      {activeTab === 'grupo' && (
        <PartyTab
          api={api}
          characters={characters}
          items={items}
          loading={loading}
          reload={reload}
          onRefresh={onRefresh}
          showNotice={showNotice}
        />
      )}
      {activeTab === 'vendedores' && (
        <>
          <ShopsTab api={api} shops={shops} reload={reload} showNotice={showNotice} />
          <DiscountsPanel
            api={api}
            discounts={discounts}
            categories={categories}
            characters={characters}
            reload={reload}
            showNotice={showNotice}
          />
        </>
      )}
      {activeTab === 'itens' && (
        <ItemsTab
          shops={shops}
          api={api}
          items={items}
          categories={categories}
          rarities={rarities}
          loading={loading}
          reload={reload}
          showNotice={showNotice}
        />
      )}
      {activeTab === 'catalogo' && (
        <CatalogTab
          api={api}
          categories={categories}
          rarities={rarities}
          loading={loading}
          reload={reload}
          showNotice={showNotice}
        />
      )}
      {activeTab === 'encomendas' && (
        <RequestsTab
          api={api}
          requests={requests}
          items={items}
          categories={categories}
          rarities={rarities}
          loading={loading}
          reload={reload}
          showNotice={showNotice}
        />
      )}
      {activeTab === 'historicos' && (
        <HistoryTab
          key={historyVersion}
          api={api}
          refreshKey={liveKey}
        />
      )}
    </section>
  );
}
