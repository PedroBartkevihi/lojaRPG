import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { env } from './env.js';

// Logs em JSON, uma linha por evento, com o id da requisicao: no painel do
// Render da para filtrar tudo o que aconteceu numa requisicao pelo reqId. Nos
// testes, so os avisos aparecem.
export function createLogger(destination) {
  return pino(LOGGER_OPTIONS, destination);
}

const LOGGER_OPTIONS = {
  level: process.env.LOG_LEVEL || (env.nodeEnv === 'test' ? 'warn' : 'info'),
  base: { service: 'lojarpg-api' },
  // Nada de credenciais nem dados pessoais no log: tokens, cookies, senhas e
  // e-mails sao trocados por [omitido].
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.refreshToken',
      '*.token',
      '*.email',
      'to'
    ],
    censor: '[omitido]'
  }
};

export const logger = createLogger();

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

// Um X-Request-Id valido que chegue (de um proxy) e mantido; senao, um novo.
// O id volta no cabecalho da resposta para o front poder mandar junto num
// relato de erro.
export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  // Sem a query (a busca pode ter texto livre) e so com o essencial.
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, path: req.url.split('?')[0] }),
    res: (res) => ({ statusCode: res.statusCode })
  },
  customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : 'info'),
  // Health checks a cada poucos segundos so poluiriam o log.
  autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
  customSuccessMessage: (req, res, responseTime) => `${req.method} ${req.url.split('?')[0]} ${res.statusCode} ${Math.round(responseTime)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${req.url.split('?')[0]} ${res.statusCode}`
});
