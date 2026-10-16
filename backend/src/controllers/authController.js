import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../schemas/authSchemas.js';
import { loginUser, logoutSession, refreshSession, registerUser } from '../services/authService.js';
import { FORGOT_PASSWORD_MESSAGE, requestPasswordReset, resetPassword } from '../services/passwordResetService.js';
import { mailEnabled } from '../services/mailService.js';
import { ApiError } from '../utils/ApiError.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie, wantsRefreshCookie } from '../utils/refreshCookie.js';
import { parse } from '../utils/validation.js';

// No modo cookie, o refresh token vai so no cookie httpOnly e sai do corpo:
// um script injetado na pagina nao consegue le-lo.
function sendSession(req, res, session, status = 200) {
  if (!wantsRefreshCookie(req)) {
    return res.status(status).json(session);
  }

  const { refreshToken, ...body } = session;
  setRefreshCookie(res, refreshToken);
  return res.status(status).json(body);
}

// O token da renovacao vem do corpo (modo antigo) ou do cookie, este so
// quando o front pede o modo cookie: o cabecalho obriga o navegador a
// perguntar ao CORS antes (preflight), e outro site nao usa o cookie.
function refreshTokenFrom(req) {
  if (req.body?.refreshToken) {
    return req.body.refreshToken;
  }

  return wantsRefreshCookie(req) ? readRefreshCookie(req) : undefined;
}

export async function register(req, res) {
  const { name, email, password } = parse(registerSchema, req.body);
  sendSession(req, res, await registerUser({ name, email, password }), 201);
}

export async function login(req, res) {
  const { email, password } = parse(loginSchema, req.body);
  sendSession(req, res, await loginUser(email, password));
}

// Uma renovacao recusada nao apaga o cookie: com duas abas renovando juntas,
// o 401 da que perde chegaria depois do cookie novo da que ganhou e o
// apagaria. Um cookie recusado fica sem uso ate o proximo login trocar.
export async function refresh(req, res) {
  sendSession(req, res, await refreshSession(refreshTokenFrom(req)));
}

// Quem saiu perde o cookie mesmo se a revogacao falhar (banco fora).
export async function logout(req, res) {
  try {
    await logoutSession(refreshTokenFrom(req));
  } finally {
    if (wantsRefreshCookie(req)) clearRefreshCookie(res);
  }
  res.json({ message: 'Logout realizado.' });
}

export async function me(req, res) {
  res.json({ user: req.user });
}

// A resposta sai antes de procurar a conta: a mesma mensagem e o mesmo tempo
// para e-mail cadastrado ou nao. Uma falha no envio fica so no log.
export async function forgotPassword(req, res) {
  const { email } = parse(forgotPasswordSchema, req.body);

  // Sem servico de e-mail o link nao sairia: a tela diz isso em vez de
  // prometer um e-mail. Depende so da configuracao, nao da conta.
  if (!mailEnabled()) {
    throw new ApiError(503, 'A recuperação de senha por e-mail ainda não foi configurada neste site.');
  }

  res.status(202).json({ message: FORGOT_PASSWORD_MESSAGE });

  requestPasswordReset(email).catch((error) => {
    console.error(`Pedido de senha nova falhou: ${error.message}`);
  });
}

export async function resetPasswordAction(req, res) {
  const { token, password } = parse(resetPasswordSchema, req.body);
  await resetPassword(token, password);
  res.json({ message: 'Senha alterada. Entre com a senha nova.' });
}
