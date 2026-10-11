import { ApiError } from '../utils/ApiError.js';

// Compartilha o bloqueio com compras/vendas; fechar a loja espera as operacoes
// em andamento terminarem. A leitura ocorre na transacao, nunca no snapshot HTTP.
export async function ensureShopOpen(campaignId, prisma) {
  const [campaign] = await prisma.$queryRaw`
    SELECT id, shop_open AS "shopOpen" FROM campaigns WHERE id = ${campaignId} FOR SHARE
  `;
  if (!campaign) throw new ApiError(404, 'Mesa não encontrada.');
  if (!campaign.shopOpen) throw new ApiError(409, 'A loja está fechada.');
}
