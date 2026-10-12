import { useCallback } from 'react';
import { usePagedHistory } from '../js/usePagedHistory.js';
import HistoryPagination from './HistoryPagination.jsx';

export default function SessionFilter({ api, value, onChange, refreshKey }) {
  const load = useCallback(async (params) => {
    const data = await api.listSessions(params);
    return { entries: data.sessions, pagination: data.pagination };
  }, [api]);
  const page = usePagedHistory(load, refreshKey);
  return <div className="session-filter">
    <label>Filtrar por sessão<select value={value || ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">Todas as sessões</option>
      <option value="none">Fora de sessão</option>
      {page.entries.map((session) => <option key={session.id} value={session.id}>Sessão {session.number}{session.endedAt ? '' : ' (aberta)'}</option>)}
    </select></label>
    <HistoryPagination page={page} label="lista de sessões" />
  </div>;
}
