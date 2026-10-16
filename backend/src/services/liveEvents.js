import { EventEmitter } from 'node:events';

// Avisos "algo mudou nesta mesa" para as telas abertas (Server-Sent Events).
// O aviso nao leva dados: cada tela recarrega o que precisa pela API, com as
// mesmas permissoes de sempre. Fica na memoria do processo, o que basta para
// uma instancia so (o plano do Render); com varias instancias, trocar por
// LISTEN/NOTIFY do PostgreSQL ou um Redis.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export const MAX_OPEN_STREAMS = 500;
let openStreams = 0;

export function publishCampaignChange(campaignId) {
  emitter.emit(`campaign:${campaignId}`, { at: new Date().toISOString() });
}

export function subscribeCampaign(campaignId, listener) {
  const channel = `campaign:${campaignId}`;
  emitter.on(channel, listener);
  return () => emitter.off(channel, listener);
}

export function reserveStream() {
  if (openStreams >= MAX_OPEN_STREAMS) {
    return false;
  }

  openStreams += 1;
  return true;
}

export function releaseStream() {
  openStreams = Math.max(0, openStreams - 1);
}

// Depois de qualquer escrita bem-sucedida numa mesa (compra, venda, recompensa,
// ajuste do Mestre...), avisa quem esta com ela aberta.
export function notifyCampaignWrites(req, res, next) {
  if (req.method !== 'GET' && req.campaign) {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        publishCampaignChange(req.campaign.id);
      }
    });
  }

  next();
}
