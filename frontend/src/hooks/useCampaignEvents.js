import { useEffect, useRef, useState } from 'react';

const FIRST_RETRY_MS = 2000;
const MAX_RETRY_MS = 30000;
// So um canal que ficou aberto esse tempo volta a esperar pouco para
// reconectar; um que cai logo depois de abrir continua com a espera crescente.
const STABLE_MS = 30000;
// Varios avisos seguidos (uma compra muda ouro, estoque e historico) viram uma
// recarga so.
const DEBOUNCE_MS = 300;

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return visible;
}

// Mantem aberto o canal SSE da mesa enquanto a aba esta visivel e conta os
// avisos "algo mudou" (eventTick). Se o canal cair, tenta de novo com espera
// crescente (2 s a 30 s); a consulta periodica continua como reserva. Ao
// reconectar, conta um aviso: o que mudou com o canal fechado nao chegou.
export function useCampaignEvents({ api, campaignId, enabled, onConnectedChange }) {
  const [eventTick, setEventTick] = useState(0);
  const visible = useDocumentVisible();
  const onConnectedRef = useRef(onConnectedChange);

  useEffect(() => {
    onConnectedRef.current = onConnectedChange;
  }, [onConnectedChange]);

  useEffect(() => {
    if (!enabled || !campaignId || !visible || !api.streamCampaignEvents || typeof ReadableStream === 'undefined') {
      return undefined;
    }

    const controller = new AbortController();
    let retryMs = FIRST_RETRY_MS;
    let debounce;
    let retryTimer;
    let attempts = 0;
    let openedAt = 0;

    const setConnected = (value) => onConnectedRef.current?.(value);
    const countChange = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => setEventTick((value) => value + 1), DEBOUNCE_MS);
    };

    async function connect() {
      attempts += 1;

      try {
        await api.streamCampaignEvents({
          signal: controller.signal,
          onEvent(name) {
            if (name === 'ready') {
              openedAt = performance.now();
              setConnected(true);
              // Qualquer tentativa que nao seja a primeira vem depois de um
              // tempo sem canal (queda ou falha ao abrir).
              if (attempts > 1) countChange();
            } else if (name === 'changed') {
              countChange();
            }
          }
        });
      } catch (_error) {
        // Rede fora, API dormindo, 503 ou canal mudo: tenta de novo mais tarde.
      }

      setConnected(false);

      if (openedAt && performance.now() - openedAt >= STABLE_MS) {
        retryMs = FIRST_RETRY_MS;
      }
      openedAt = 0;

      if (!controller.signal.aborted) {
        retryTimer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      }
    }

    connect();

    return () => {
      controller.abort();
      window.clearTimeout(debounce);
      window.clearTimeout(retryTimer);
      setConnected(false);
    };
  }, [api, campaignId, enabled, visible]);

  return eventTick;
}
