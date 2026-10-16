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

// Pedidos de senha nova e trocas pelo link: poucos por IP, porque cada pedido
// pode mandar um e-mail.
export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Muitos pedidos de senha nova. Aguarde alguns minutos e tente novamente.'
  }
});

// Envio da senha nova pelo link: mais folgado, porque a pessoa pode errar a
// regra da senha algumas vezes; o token de 48 bytes nao se adivinha.
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  }
});
