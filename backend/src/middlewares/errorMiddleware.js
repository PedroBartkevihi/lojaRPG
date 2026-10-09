import { ApiError } from '../utils/ApiError.js';

export function notFound(_req, _res, next) {
  next(new ApiError(404, 'Rota nao encontrada.'));
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'Registro duplicado.' });
  }

  if (error.code === 'P2003') {
    return res.status(400).json({ message: 'Referencia invalida.' });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({ message: 'Registro nao encontrado.' });
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Erro interno do servidor.' : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json({ message });
}
