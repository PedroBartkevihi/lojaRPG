import { ROLES } from '../config/roles.js';
import { ApiError } from '../utils/ApiError.js';

export function requireGameMaster(req, _res, next) {
  if (req.user?.role !== ROLES.GAME_MASTER) {
    return next(new ApiError(403, 'Acesso permitido apenas para Mestre.'));
  }

  return next();
}
