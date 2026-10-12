import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Coins, History, PackagePlus, RefreshCcw, Tags } from 'lucide-react';
import CatalogTab from '../components/admin/CatalogTab.jsx';
import HistoryTab from '../components/admin/HistoryTab.jsx';
import ItemsTab from '../components/admin/ItemsTab.jsx';
import PartyTab from '../components/admin/PartyTab.jsx';
import ShopsTab from '../components/admin/ShopsTab.jsx';

// A aba fica no endereco (?aba=itens) para sobreviver a um recarregamento.
const TABS = [
  { key: 'grupo', label: 'Grupo e moedas', Icon: Coins },
  { key: 'vendedores', label: 'Vendedores', Icon: Tags },
  { key: 'itens', label: 'Itens', Icon: PackagePlus },
  { key: 'catalogo', label: 'Catálogo', Icon: Tags },
  { key: 'historicos', label: 'Históricos', Icon: History }
];

export default function AdminPage({ api, liveKey, showNotice, onRefresh }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyVersion, setHistoryVersion] = useState(0);
  const requestVersion = useRef(0);
  const loadedTab = useRef(null);

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
        vendedores: [() => api.listShops()],
        itens: [() => api.listShops(), () => api.listItems({ includeInactive: true }), () => api.listCategories(), () => api.listRarities()],
        catalogo: [() => api.listCategories(), () => api.listRarities()],
        historicos: []
      };
      const data = Object.assign({}, ...await Promise.all(sources[activeTab].map((load) => load())));
      if (request !== requestVersion.current) return;
      if (data.shops) setShops(data.shops);
      if (data.items) setItems(data.items);
      if (data.characters) setCharacters(data.characters);
      if (data.categories) setCategories(data.categories);
      if (data.rarities) setRarities(data.rarities);
      loadedTab.current = activeTab;
    } catch (error) {
      if (request === requestVersion.current) throw error;
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [api, activeTab]);

  const reload = useCallback(() => loadAdminData({ silent: true }), [loadAdminData]);

  useEffect(() => {
    loadAdminData({ silent: loadedTab.current === activeTab }).catch((error) => showNotice(error.message));
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
      {activeTab === 'vendedores' && <ShopsTab api={api} shops={shops} reload={reload} showNotice={showNotice} />}
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
