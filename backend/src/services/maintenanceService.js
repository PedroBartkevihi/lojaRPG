import { errorReason, logger } from '../config/logger.js';
import { deleteStaleRefreshTokens } from '../models/refreshTokenModel.js';
import { deleteStalePasswordResetTokens } from './passwordResetService.js';

const MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Limpezas periodicas do banco. Rodam no inicio da API (no plano gratuito do
// Render, a cada vez que ela acorda) e depois a cada 6 horas.
export async function runMaintenance(now = new Date()) {
  return {
    refreshTokens: await deleteStaleRefreshTokens(now),
    passwordResetTokens: await deleteStalePasswordResetTokens(now)
  };
}

export function startMaintenance(log = logger) {
  async function run() {
    try {
      const result = await runMaintenance();
      if (result.refreshTokens + result.passwordResetTokens > 0) {
        log.info(
          `Limpeza: ${result.refreshTokens} refresh token(s) e ${result.passwordResetTokens} link(s) de senha vencidos apagados.`
        );
      }
    } catch (error) {
      log.warn(`Limpeza do banco falhou: ${errorReason(error)}`);
    }
  }

  run();
  // unref: o timer nao segura o processo aberto num desligamento.
  return setInterval(run, MAINTENANCE_INTERVAL_MS).unref();
}
