import { ApiError } from '../utils/ApiError.js';

export function requireCopperUnit(req, _res, next) {
  const monetaryWrite = ['POST', 'PUT', 'PATCH'].includes(req.method) &&
    /\/(?:items(?:\/\d+|\/import)?|characters(?:\/\d+\/gold)?|purchases|rewards\/gold|inventory\/\d+\/(?:give|sell)|requests(?:\/\d+\/approve)?)$/.test(req.path);
  if (monetaryWrite && req.get('X-Currency-Unit') !== 'PC') {
    return next(new ApiError(428, 'A versão das moedas mudou. Recarregue a página antes de continuar (X-Currency-Unit: PC).'));
  }
  next();
}
