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

// Um LOG_LEVEL que o pino nao conhece ("warning", ou com espaco colado no
// painel) derrubaria a API no inicio; nesse caso fica o nivel padrao.
export function resolveLogLevel(value, nodeEnv = env.nodeEnv) {
  const wanted = value?.trim().toLowerCase();
  if (wanted && (wanted === 'silent' || wanted in pino.levels.values)) {
    return wanted;
  }
  return nodeEnv === 'test' ? 'warn' : 'info';
}

// Uma linha que explica um erro. As mensagens do Prisma comecam com uma
// quebra de linha e "Invalid `prisma.x()` invocation:"; o motivo vem depois.
export function errorReason(error) {
  const lines = String(error?.message ?? error).split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => !/^Invalid `.+` invocation:?$/.test(line)) || lines[0] || 'sem mensagem';
}

const LOGGER_OPTIONS = {
  level: resolveLogLevel(process.env.LOG_LEVEL),
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

if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.trim().toLowerCase() !== logger.level) {
  logger.warn(`LOG_LEVEL "${process.env.LOG_LEVEL}" ignorado; usando ${logger.level}.`);
}

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
  // originalUrl: dentro de um router (/auth, /campaigns...) o Express deixa em
  // req.url so o pedaco depois do prefixo, e a mensagem sairia "POST / 201".
  customSuccessMessage: (req, res, responseTime) => `${req.method} ${routeOf(req)} ${res.statusCode} ${Math.round(responseTime)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${routeOf(req)} ${res.statusCode}`
});

export function routeOf(req) {
  return (req.originalUrl || req.url).split('?')[0];
}
