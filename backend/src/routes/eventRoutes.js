import { Router } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { releaseStream, reserveStream, subscribeCampaign } from '../services/liveEvents.js';

const HEARTBEAT_MS = 25 * 1000;
// A conexao fecha sozinha de tempos em tempos: o navegador reconecta com o
// token atual, e quem foi removido da mesa deixa de receber avisos.
const STREAM_MAX_MS = 10 * 60 * 1000;
// Quem nao le o canal (aba congelada, cliente quebrado) nao acumula avisos na
// memoria da API: passou disso esperando para sair, a conexao cai e o site
// reconecta. O aviso nao leva dados, entao nada se perde.
const MAX_BUFFERED_BYTES = 16 * 1024;

export const eventRoutes = Router();

// GET /campaigns/:id/events: canal SSE da mesa. So avisa que algo mudou
// ("changed"); a tela continua buscando os dados pela API.
eventRoutes.get('/', (req, res, next) => {
  // O Express tambem manda HEAD para o get; um HEAD nao le eventos e so
  // seguraria a vaga e a conexao ate o fim dos 10 min.
  if (req.method !== 'GET') {
    res.set('Allow', 'GET');
    return next(new ApiError(405, 'Use GET para abrir o canal.'));
  }

  // A conexao pode ter caido enquanto o login e a mesa eram conferidos no
  // banco. O 'close' ja passou e nao vem de novo: sem isso a vaga e os
  // timers ficariam presos para sempre.
  if (res.destroyed || req.socket?.destroyed !== false) {
    return undefined;
  }

  const reservation = reserveStream(req.user.id);
  if (reservation === 'full') {
    return next(new ApiError(503, 'Muitas conexões abertas. As telas seguem se atualizando a cada 10 segundos.'));
  }
  if (reservation === 'user') {
    return next(new ApiError(429, 'Muitas abas abertas nesta conta. As telas seguem se atualizando a cada 10 segundos.'));
  }

  let closed = false;
  let heartbeat;
  let limit;
  let unsubscribe = () => {};

  const cleanup = () => {
    if (closed) return;
    closed = true;
    unsubscribe();
    clearInterval(heartbeat);
    clearTimeout(limit);
    releaseStream(req.user.id);
  };

  // Nunca escreve depois do fim (o 'write after end' viraria um erro sem
  // tratamento e derrubaria o processo) e corta quem nao esta lendo.
  const send = (chunk) => {
    if (closed || res.writableEnded || res.destroyed) return;
    res.write(chunk);
    if (res.writableLength > MAX_BUFFERED_BYTES) {
      cleanup();
      res.destroy();
    }
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Proxies (nginx, Render) nao seguram os eventos num buffer.
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  send('retry: 5000\n\nevent: ready\ndata: {}\n\n');

  unsubscribe = subscribeCampaign(req.campaign.id, (payload) => {
    send(`event: changed\ndata: ${JSON.stringify(payload)}\n\n`);
  });
  // Comentario a cada 25 s: proxies fecham conexoes paradas.
  heartbeat = setInterval(() => send(': ping\n\n'), HEARTBEAT_MS);
  limit = setTimeout(() => {
    cleanup();
    res.end();
  }, STREAM_MAX_MS);
  return undefined;
});
