import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { parse } from '../utils/validation.js';

// Erros do navegador (excecoes nao tratadas e telas que quebram) chegam aqui e
// vao para o mesmo log da API, com o reqId da ultima resposta quando ha. Sem
// dados pessoais: so mensagem, pilha, a rota da tela (sem query nem
// fragmento) e o navegador. Sem login, porque a tela de entrada tambem pode
// quebrar; o limite por IP segura abuso.
const clientErrorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitos relatos de erro.' }
});

const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300).optional(),
  requestId: z.string().max(64).optional(),
  kind: z.enum(['error', 'unhandledrejection', 'render']).optional()
});

export const clientErrorRoute = Router();

clientErrorRoute.post('/', clientErrorLimiter, (req, res) => {
  const report = parse(clientErrorSchema, req.body);
  req.log.warn(
    {
      client: {
        ...report,
        path: report.path?.split(/[?#]/)[0],
        userAgent: req.get('user-agent')?.slice(0, 200)
      }
    },
    `Erro no navegador: ${report.message}`
  );
  res.status(204).end();
});
