import { ApiError } from '../utils/ApiError.js';

// Bloqueia os vendedores antes de saldos/estoques. Fechar espera as operações
// em andamento; a ordem por id também vale para carrinhos com vários vendedores.
export async function ensureShopsOpen(campaignId, shopIds, prisma) {
  for (const id of [...new Set(shopIds)].sort((a, b) => a - b)) {
    const [shop] = await prisma.$queryRaw`SELECT id, name, is_open AS "isOpen" FROM shops
      WHERE id = ${id} AND campaign_id = ${campaignId} FOR SHARE`;
    if (!shop) throw new ApiError(404, 'Vendedor não encontrado.');
    if (!shop.isOpen) throw new ApiError(409, `O vendedor ${shop.name} está fechado.`);
  }
}
