import { useCallback, useEffect, useRef, useState } from 'react';

// Aviso que some sozinho. Cada aviso novo reinicia a contagem: sem isso, o
// prazo do aviso anterior apagaria o novo antes da hora.
export function useNotice(durationMs = 3500) {
  const [notice, setNotice] = useState('');
  const timer = useRef(null);

  const showNotice = useCallback(
    (message) => {
      window.clearTimeout(timer.current);
      setNotice(message);
      timer.current = window.setTimeout(() => setNotice(''), durationMs);
    },
    [durationMs]
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return [notice, showNotice];
}
