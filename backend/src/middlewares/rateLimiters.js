import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  }
});

// A renovacao acontece sozinha quando o access token vence (a cada 15 min, em
// cada aparelho), e amigos na mesma rede dividem o IP. Por isso ela tem um
// limite proprio, mais folgado, que nao gasta as tentativas de login.
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Muitas renovações de sessão. Aguarde alguns minutos e tente novamente.'
  }
});

// Limita tentativas de adivinhar codigos de convite.
export const inviteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Muitas tentativas de convite. Aguarde alguns minutos e tente novamente.'
  }
});
