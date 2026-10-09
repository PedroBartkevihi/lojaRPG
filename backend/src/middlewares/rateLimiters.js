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
