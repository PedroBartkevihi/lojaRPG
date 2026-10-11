import { ApiError } from '../utils/ApiError.js';

export function notFound(_req, _res, next) {
  next(new ApiError(404, 'Rota não encontrada.'));
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'Registro duplicado.' });
  }

  if (error.code === 'P2003') {
    return res.status(400).json({ message: 'Referência inválida.' });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({ message: 'Registro não encontrado.' });
  }

  // Conflito ou deadlock (P2034) e transacao que passou do tempo esperando
  // outra (P2028): a operacao foi desfeita inteira e pode ser repetida.
  // O conector do Prisma 6 tambem pode encapsular SQLSTATE 40P01 sem code.
  const postgresDeadlock = error.name === 'PrismaClientUnknownRequestError' &&
    /PostgresError\s*\{\s*code:\s*"40P01"/.test(error.message);
  if (error.code === 'P2034' || error.code === 'P2028' || postgresDeadlock) {
    console.warn(`Transação desfeita (${error.code || '40P01'}): ${error.message.split('\n')[0]}`);
    return res.status(409).json({ message: 'Outra operação usava os mesmos dados. Tente de novo.' });
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Erro interno do servidor.' : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json({ message });
}
