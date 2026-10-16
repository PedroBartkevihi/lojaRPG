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

// Assinaturas de envio de imagem por conta (a da demonstracao e publica): cada
// uma vale para um arquivo so, e o limite segura quem tentar usar a conta do
// Cloudinary como hospedagem.
export const itemImageRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `usuario-${req.user.id}`,
  message: {
    message: 'Muitos envios de imagem. Aguarde um pouco e tente novamente.'
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
