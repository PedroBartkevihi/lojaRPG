import { EventEmitter } from 'node:events';

// Avisos "algo mudou nesta mesa" para as telas abertas (Server-Sent Events).
// O aviso nao leva dados: cada tela recarrega o que precisa pela API, com as
// mesmas permissoes de sempre. Fica na memoria do processo, o que basta para
// uma instancia so (o plano do Render); com varias instancias, trocar por
// LISTEN/NOTIFY do PostgreSQL ou um Redis.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export const MAX_OPEN_STREAMS = 500;
// Por conta: uma pessoa (ou a conta de demonstracao, de senha publica) nao
// ocupa todas as vagas do processo.
export const MAX_STREAMS_PER_USER = 10;
let openStreams = 0;
const streamsByUser = new Map();

export function publishCampaignChange(campaignId) {
  emitter.emit(`campaign:${campaignId}`, { at: new Date().toISOString() });
}

export function subscribeCampaign(campaignId, listener) {
  const channel = `campaign:${campaignId}`;
  emitter.on(channel, listener);
  return () => emitter.off(channel, listener);
}

// Devolve 'ok', 'full' (o processo lotou) ou 'user' (a conta lotou).
export function reserveStream(userId) {
  const mine = streamsByUser.get(userId) || 0;

  if (openStreams >= MAX_OPEN_STREAMS) {
    return 'full';
  }

  if (mine >= MAX_STREAMS_PER_USER) {
    return 'user';
  }

  openStreams += 1;
  streamsByUser.set(userId, mine + 1);
  return 'ok';
}

export function releaseStream(userId) {
  openStreams = Math.max(0, openStreams - 1);
  const mine = (streamsByUser.get(userId) || 0) - 1;

  if (mine > 0) {
    streamsByUser.set(userId, mine);
  } else {
    streamsByUser.delete(userId);
  }
}

export function openStreamCount() {
  return openStreams;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Depois de qualquer escrita bem-sucedida numa mesa (compra, venda, recompensa,
// ajuste do Mestre...), avisa quem esta com ela aberta. O aviso sai quando a
// resposta e montada, depois do COMMIT, e nao no 'finish': se quem escreveu
// fechar a aba nesse meio-tempo, o 'finish' nao vem, mas a mudanca aconteceu.
export function notifyCampaignWrites(req, res, next) {
  if (!SAFE_METHODS.has(req.method) && req.campaign) {
    const end = res.end;
    let published = false;

    res.end = function endAndNotify(...args) {
      const result = end.apply(this, args);

      if (!published && res.statusCode < 400) {
        published = true;
        publishCampaignChange(req.campaign.id);
      }

      return result;
    };
  }

  next();
}
