import { ROLES } from '../config/roles.js';
import { ApiError } from '../utils/ApiError.js';

// O papel vale para a mesa carregada por loadCampaign, nao para a conta.
export function isGameMaster(req) {
  return req.membership?.role === ROLES.GAME_MASTER;
}

export function requireGameMaster(req, _res, next) {
  if (!isGameMaster(req)) {
    return next(new ApiError(403, 'Acesso permitido apenas para Mestre.'));
  }

  return next();
}
