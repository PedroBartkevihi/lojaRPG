import { useEffect, useState } from 'react';

export const LIVE_REFRESH_MS = 10000;

// Conta uma batida a cada `intervalMs` enquanto a aba esta visivel, e mais uma
// quando a pessoa volta para a aba. As telas recarregam os dados a cada batida,
// para o que outro jogador ou o Mestre fez aparecer sem recarregar a pagina.
// Aba escondida nao gera batidas, para nao manter a API e o banco acordados a
// toa.
export function useLiveTick(enabled = true, intervalMs = LIVE_REFRESH_MS) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function beat() {
      if (!document.hidden) {
        setTick((value) => value + 1);
      }
    }

    const timer = window.setInterval(beat, intervalMs);
    document.addEventListener('visibilitychange', beat);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [enabled, intervalMs]);

  return tick;
}
