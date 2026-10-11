import { useCallback } from 'react';
import { History } from 'lucide-react';
import { usePagedHistory } from '../js/usePagedHistory.js';
import InventoryLogList from './InventoryLogList.jsx';
import HistoryPagination from './HistoryPagination.jsx';
import { SkeletonRows } from './Skeleton.jsx';

export default function InventoryHistory({ api, characterId, refreshKey }) {
  const loadPage = useCallback(async (params) => {
    const data = await api.characterInventoryLogs(characterId, params);
    return { entries: data.logs, pagination: data.pagination };
  }, [api, characterId]);
  const page = usePagedHistory(loadPage, refreshKey, Boolean(characterId));
  return (
    <div className="surface-panel inventory-history">
      <div className="panel-title"><History size={20} /><h3>Movimentações</h3></div>
      {page.loading && page.entries.length === 0 ? <SkeletonRows count={3} /> : <InventoryLogList logs={page.entries} />}
      <HistoryPagination page={page} label="movimentações do personagem" />
    </div>
  );
}
