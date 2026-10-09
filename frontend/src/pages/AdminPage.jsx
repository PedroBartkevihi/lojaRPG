import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Coins, History, PackagePlus, RefreshCcw, Tags } from 'lucide-react';
import CatalogTab from '../components/admin/CatalogTab.jsx';
import HistoryTab from '../components/admin/HistoryTab.jsx';
import ItemsTab from '../components/admin/ItemsTab.jsx';
import PartyTab from '../components/admin/PartyTab.jsx';

// A aba fica no endereco (?aba=itens) para sobreviver a um recarregamento.
const TABS = [
  { key: 'grupo', label: 'Grupo e ouro', Icon: Coins },
  { key: 'itens', label: 'Itens', Icon: PackagePlus },
  { key: 'catalogo', label: 'Catálogo', Icon: Tags },
  { key: 'historicos', label: 'Históricos', Icon: History }
];

export default function AdminPage({ api, liveKey, showNotice, onRefresh }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [goldAuditLogs, setGoldAuditLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeTab = TABS.some((tab) => tab.key === searchParams.get('aba')) ? searchParams.get('aba') : 'grupo';

  // `silent` e a recarga automatica e a que vem depois de uma acao: a tela
  // atual fica ate os dados novos chegarem, sem "Carregando".
  async function loadAdminData({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [itemsData, charactersData, auditData, categoriesData, raritiesData, stockData, logsData] =
        await Promise.all([
          api.listItems({ includeInactive: true }),
          api.listCharacters(),
          api.listGoldAudit(),
          api.listCategories(),
          api.listRarities(),
          api.listStockMovements(),
          api.listInventoryLogs()
        ]);
      setItems(itemsData.items);
      setCharacters(charactersData.characters);
      setGoldAuditLogs(auditData.logs);
      setCategories(categoriesData.categories);
      setRarities(raritiesData.rarities);
      setStockMovements(stockData.movements);
      setInventoryLogs(logsData.logs);
    } finally {
      setLoading(false);
    }
  }

  const reload = () => loadAdminData({ silent: true });

  useEffect(() => {
    loadAdminData().catch((error) => showNotice(error.message));
  }, []);

  useEffect(() => {
    if (liveKey) {
      reload().catch(() => {});
    }
  }, [liveKey]);

  return (
    <section className="wide-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Controle do Mestre</p>
          <h2>Painel do Mestre</h2>
        </div>
        <button className="secondary-action" onClick={() => loadAdminData().catch((error) => showNotice(error.message))}>
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
      {activeTab === 'itens' && (
        <ItemsTab
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
          api={api}
          stockMovements={stockMovements}
          inventoryLogs={inventoryLogs}
          goldAuditLogs={goldAuditLogs}
          loading={loading}
          purchasesKey={`${liveKey}:${items.length}:${characters.length}`}
        />
      )}
    </section>
  );
}
