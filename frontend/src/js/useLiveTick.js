import { useEffect, useRef, useState } from 'react';

export const LIVE_REFRESH_MS = 10000;

// Conta uma batida a cada `intervalMs` enquanto a aba esta visivel, e mais uma
// quando a pessoa volta para a aba. As telas recarregam os dados a cada batida,
// para o que outro jogador ou o Mestre fez aparecer sem recarregar a pagina.
// Aba escondida nao gera batidas, para nao manter a API e o banco acordados a
// toa. Trocar o intervalo (o canal de tempo real abrindo e fechando) conta a
// partir da ultima batida, e nao do zero, para nao adiar a proxima. O tempo e
// o do performance.now(), que nao volta se o relogio do sistema for ajustado.
export function useLiveTick(enabled = true, intervalMs = LIVE_REFRESH_MS) {
  const [tick, setTick] = useState(0);
  const lastBeat = useRef(0);
  const wasEnabled = useRef(false);

  useEffect(() => {
    if (!enabled) {
      wasEnabled.current = false;
      return undefined;
    }

    if (!wasEnabled.current) {
      wasEnabled.current = true;
      lastBeat.current = performance.now();
    }

    let timer;

    function beat() {
      lastBeat.current = performance.now();
      if (!document.hidden) {
        setTick((value) => value + 1);
      }
    }

    function schedule() {
      timer = window.setTimeout(() => {
        if (performance.now() - lastBeat.current >= intervalMs) beat();
        schedule();
      }, Math.max(0, lastBeat.current + intervalMs - performance.now()));
    }

    schedule();
    document.addEventListener('visibilitychange', beat);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [enabled, intervalMs]);

  return tick;
}
