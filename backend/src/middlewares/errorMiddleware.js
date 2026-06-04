import { ApiError } from '../utils/ApiError.js';

export function notFound(_req, _res, next) {
  next(new ApiError(404, 'Rota nao encontrada.'));
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ message: 'Registro duplicado.' });
  }

  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({ message: 'Referencia invalida.' });
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Erro interno do servidor.' : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json({ message });
}
