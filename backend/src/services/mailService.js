import { appendFile } from 'node:fs/promises';
import { env } from '../config/env.js';

// E-mails dos testes: ficam aqui em vez de sair, e os testes leem o link.
export const testOutbox = [];

const RESEND_URL = 'https://api.resend.com/emails';

export function mailConfigured() {
  return Boolean(env.resendApiKey && env.emailFrom);
}

// Envia um e-mail transacional pela API HTTP do Resend (plano gratuito). Sem
// configuracao, o e-mail nao sai: nos testes ele vai para testOutbox, em
// desenvolvimento o texto aparece no log da API (para testar o fluxo sem
// servico de e-mail) e em producao so fica um aviso, sem o conteudo.
export async function sendMail({ to, subject, text, html }) {
  if (env.nodeEnv === 'test') {
    testOutbox.push({ to, subject, text, html });
    return;
  }

  // Caixa de saida em arquivo (uma linha JSON por e-mail), para os testes de
  // ponta a ponta lerem o link. Nunca em producao.
  if (process.env.MAIL_OUTBOX_FILE && env.nodeEnv !== 'production') {
    await appendFile(process.env.MAIL_OUTBOX_FILE, `${JSON.stringify({ to, subject, text })}\n`);
    return;
  }

  if (!mailConfigured()) {
    if (env.nodeEnv === 'production') {
      console.warn(`E-mail "${subject}" não enviado: configure RESEND_API_KEY e EMAIL_FROM.`);
    } else {
      console.log(`[e-mail não enviado, sem RESEND_API_KEY] Para: ${to}\nAssunto: ${subject}\n${text}`);
    }
    return;
  }

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    // O corpo do erro do Resend nao tem dados do destinatario.
    throw new Error(`Resend respondeu ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
}
