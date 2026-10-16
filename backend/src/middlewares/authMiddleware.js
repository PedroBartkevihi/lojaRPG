import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findSessionUser } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';

export async function authenticate(req, _res, next) {
  const authorization = req.get('authorization') || '';
  const [type, token] = authorization.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Token de autenticação não informado.'));
  }

  let payload;

  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    return next(new ApiError(401, 'Token inválido ou expirado.'));
  }

  // Uma falha do banco aqui e indisponibilidade, nao credencial ruim: vai para
  // o tratamento de erros em vez de virar 401, que faria o front deslogar.
  try {
    const session = await findSessionUser(payload.sub);

    if (!session) {
      return next(new ApiError(401, 'Usuário não encontrado.'));
    }

    // Token emitido antes da ultima troca de senha: a sessao foi encerrada.
    // Tokens de antes desta versao nao tem sv e contam como versao 0.
    if ((payload.sv ?? 0) !== session.sessionVersion) {
      return next(new ApiError(401, 'Sessão encerrada. Entre de novo.'));
    }

    req.user = session.user;
    return next();
  } catch (error) {
    return next(error);
  }
}
