import { useCallback, useEffect, useRef, useState } from 'react';

export function usePagedHistory(loadPage, refreshKey, enabled = true) {
  const [entries, setEntries] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const pending = useRef(false);
  // Aviso de mudanca que chegou com uma carga em andamento: a carga pode ter
  // lido o banco antes da mudanca, entao roda mais uma ao terminar.
  const stale = useRef(false);
  const version = useRef(0);
  const lastRefresh = useRef(refreshKey);

  const load = useCallback(async (cursor, append = false) => {
    const request = ++version.current;
    pending.current = true;
    stale.current = false;
    setLoading(true);
    setError('');
    try {
      const page = await loadPage({ limit: 25, ...(cursor ? { cursor } : {}) });
      if (request !== version.current) return;
      setEntries((current) => append ? [...new Map([...current, ...page.entries].map((entry) => [entry.id, entry])).values()] : page.entries);
      setNextCursor(page.pagination?.nextCursor || null);
    } catch (requestError) {
      if (request === version.current) setError(requestError.message);
    } finally {
      if (request === version.current) {
        pending.current = false;
        setLoading(false);
        if (stale.current && !expandedRef.current) load();
      }
    }
  }, [loadPage]);

  const refresh = useCallback(() => {
    expandedRef.current = false;
    setExpanded(false);
    return load();
  }, [load]);

  useEffect(() => {
    setEntries([]);
    setNextCursor(null);
    if (enabled) refresh();
    return () => { version.current += 1; };
  }, [enabled, refresh]);

  useEffect(() => {
    if (lastRefresh.current === refreshKey) return;
    lastRefresh.current = refreshKey;
    // O polling nao esconde registros antigos enquanto o usuario os le.
    if (!enabled || expandedRef.current) return;
    if (pending.current) {
      stale.current = true;
      return;
    }
    load();
  }, [enabled, load, refreshKey]);

  function loadMore() {
    if (!nextCursor || pending.current) return;
    expandedRef.current = true;
    setExpanded(true);
    return load(nextCursor, true);
  }

  return { entries, nextCursor, loading, error, expanded, loadMore, refresh };
}
