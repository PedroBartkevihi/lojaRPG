import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findUserById } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';

export async function authenticate(req, _res, next) {
  const authorization = req.get('authorization') || '';
  const [type, token] = authorization.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Token de autenticação não informado.'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await findUserById(payload.sub);

    if (!user) {
      return next(new ApiError(401, 'Usuário não encontrado.'));
    }

    req.user = user;
    return next();
  } catch (_error) {
    return next(new ApiError(401, 'Token inválido ou expirado.'));
  }
}
