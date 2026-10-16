import { isDemoAccount } from '../config/demo.js';
import { env } from '../config/env.js';
import { withTransaction } from '../database/transaction.js';
import { getPrisma } from '../database/connection.js';
import { findUserByEmail } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { createOpaqueToken, hashToken } from '../utils/tokens.js';
import { sendMail } from './mailService.js';

export const RESET_TOKEN_MINUTES = 30;
// Um pedido por conta a cada minuto: evita encher a caixa de alguem de e-mails.
const RESEND_INTERVAL_MS = 60 * 1000;

export const FORGOT_PASSWORD_MESSAGE =
  `Se o e-mail estiver cadastrado, enviamos um link para criar uma senha nova. Ele vale por ${RESET_TOKEN_MINUTES} minutos.`;

const INVALID_LINK_MESSAGE = 'Link inválido ou vencido. Peça um novo na tela de entrada.';

function resetEmail(user, link) {
  const text = [
    `Olá, ${user.name}.`,
    '',
    'Recebemos um pedido para criar uma senha nova na lojaRPG. Abra o link abaixo:',
    link,
    '',
    `O link vale por ${RESET_TOKEN_MINUTES} minutos e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: a senha atual continua valendo.`
  ].join('\n');
  const html = `<p>Olá, ${escapeHtml(user.name)}.</p>
<p>Recebemos um pedido para criar uma senha nova na lojaRPG.</p>
<p><a href="${link}">Criar uma senha nova</a></p>
<p>O link vale por ${RESET_TOKEN_MINUTES} minutos e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: a senha atual continua valendo.</p>`;

  return { to: user.email, subject: 'Criar uma senha nova na lojaRPG', text, html };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// Cria o token e manda o e-mail. Quem chama responde antes de esperar por
// isto, entao a resposta e o tempo sao os mesmos exista o e-mail ou nao.
export async function requestPasswordReset(email) {
  const user = await findUserByEmail(email);

  // As contas da demonstracao sao publicas: ninguem troca a senha delas.
  if (!user || isDemoAccount(user)) {
    return false;
  }

  const token = createOpaqueToken();
  const created = await withTransaction(async (tx) => {
    // A trava na conta faz pedidos simultaneos esperarem um pelo outro; o
    // segundo ja encontra o link recem-criado e nao manda outro e-mail.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    const recent = await tx.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_INTERVAL_MS) } }
    });

    if (recent) {
      return false;
    }

    // So o link mais recente vale.
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    const now = Date.now();
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        createdAt: new Date(now),
        expiresAt: new Date(now + RESET_TOKEN_MINUTES * 60 * 1000)
      }
    });
    return true;
  });

  if (!created) {
    return false;
  }

  // O token vai depois do #: o fragmento nao chega ao servidor do site nem
  // aparece em logs de acesso ou no Referer.
  await sendMail(resetEmail(user, `${env.appUrl}/redefinir-senha#token=${token}`));
  return true;
}

// Troca a senha e encerra as sessoes abertas da conta (quem pediu a troca
// pode estar tirando alguem de dentro dela).
export async function resetPassword(token, password) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
    throw new ApiError(400, INVALID_LINK_MESSAGE);
  }

  const passwordHash = await hashPassword(password);

  await withTransaction(async (prisma) => {
    const tokenHash = hashToken(token);
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      throw new ApiError(400, INVALID_LINK_MESSAGE);
    }

    // Dois envios do mesmo link ao mesmo tempo: so um marca o uso.
    const { count } = await prisma.passwordResetToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    if (count !== 1) {
      throw new ApiError(400, INVALID_LINK_MESSAGE);
    }

    await prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } });
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  });
}

// Limpeza periodica: links vencidos ou usados ha mais de um dia.
export async function deleteStalePasswordResetTokens(now = new Date(), prisma = getPrisma()) {
  const { count } = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }, { usedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }]
    }
  });
  return count;
}
