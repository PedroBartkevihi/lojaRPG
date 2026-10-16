import { Router } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { releaseStream, reserveStream, subscribeCampaign } from '../services/liveEvents.js';

const HEARTBEAT_MS = 25 * 1000;
// A conexao fecha sozinha de tempos em tempos: o navegador reconecta com o
// token atual, e quem foi removido da mesa deixa de receber avisos.
const STREAM_MAX_MS = 10 * 60 * 1000;

export const eventRoutes = Router();

// GET /campaigns/:id/events: canal SSE da mesa. So avisa que algo mudou
// ("changed"); a tela continua buscando os dados pela API.
eventRoutes.get('/', (req, res, next) => {
  if (!reserveStream()) {
    return next(new ApiError(503, 'Muitas conexões abertas. As telas seguem se atualizando a cada 10 segundos.'));
  }

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Proxies (nginx, Render) nao seguram os eventos num buffer.
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 5000\n\nevent: ready\ndata: {}\n\n');

  const unsubscribe = subscribeCampaign(req.campaign.id, (payload) => {
    res.write(`event: changed\ndata: ${JSON.stringify(payload)}\n\n`);
  });
  // Comentario a cada 25 s: proxies fecham conexoes paradas.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  const limit = setTimeout(() => res.end(), STREAM_MAX_MS);
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    unsubscribe();
    clearInterval(heartbeat);
    clearTimeout(limit);
    releaseStream();
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
});
