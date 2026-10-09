import { useEffect, useState } from 'react';

// Fica verdadeiro quando uma espera passa de `delayMs`. No plano gratuito do
// Render a API dorme e a primeira requisicao leva quase um minuto; o aviso
// explica a demora em vez de deixar a tela parecendo travada.
export function useSlowHint(active, delayMs = 4000) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setSlow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return slow;
}

export const SLOW_API_MESSAGE =
  'A API do plano gratuito está acordando. A primeira resposta pode levar até um minuto.';
