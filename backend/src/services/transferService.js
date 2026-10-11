import { createHash } from 'node:crypto';
import { withTransaction } from '../database/transaction.js';
import { debitCharacterGold, creditCharacterGold, findCharacterById } from '../models/characterModel.js';
import { createGoldAuditLog } from '../models/goldAuditModel.js';
import { addInventoryItem, createInventoryLog, removeInventoryItem } from '../models/inventoryModel.js';
import { findItemById } from '../models/itemModel.js';
import { ApiError } from '../utils/ApiError.js';

export async function transfer({ user, campaignId, characterId, data }) {
  if (characterId === data.targetCharacterId) throw new ApiError(400, 'Escolha outro personagem para receber.');
  const { idempotencyKey: key, ...payload } = data;
  const identity = { userId: user.id, campaignId, key };
  const requestHash = createHash('sha256').update(JSON.stringify({ characterId, ...payload })).digest('hex');
  return withTransaction(async (prisma) => {
    const source = await findCharacterById(characterId, campaignId, prisma);
    if (!source) throw new ApiError(404, 'Personagem não encontrado.');
    if (source.userId !== user.id) throw new ApiError(403, 'Você só pode entregar bens dos seus personagens.');
    const reserved = await prisma.transferRequest.createMany({ data: { ...identity, requestHash }, skipDuplicates: true });
    if (!reserved.count) {
      const previous = await prisma.transferRequest.findUnique({ where: { userId_campaignId_key: identity } });
      if (previous.requestHash !== requestHash) throw new ApiError(409, 'Esta chave já foi usada em outra transferência.');
      return previous.response;
    }

    // NO KEY UPDATE serializa saldos sem conflitar com as FKs dos historicos.
    await prisma.$queryRaw`SELECT id FROM characters
      WHERE campaign_id = ${campaignId} AND id IN (${characterId}, ${data.targetCharacterId})
      ORDER BY id FOR NO KEY UPDATE`;
    const target = await prisma.character.findFirst({
      where: { id: data.targetCharacterId, campaignId, user: { memberships: { some: { campaignId } } } }
    });
    if (!target) throw new ApiError(404, 'Destinatário não encontrado nesta mesa.');
    const sender = await findCharacterById(characterId, campaignId, prisma);
    if (data.gold > 0) {
      if (!(await debitCharacterGold(characterId, data.gold, prisma))) throw new ApiError(400, 'Ouro insuficiente para a transferência.');
      if (target.gold + data.gold > 2147483647) throw new ApiError(400, 'Saldo do destinatário excede o limite permitido.');
      await creditCharacterGold(target.id, data.gold, prisma);
      for (const [character, delta, direction] of [[sender, -data.gold, `para ${target.name}`], [target, data.gold, `de ${sender.name}`]]) {
        await createGoldAuditLog({ actorUserId: user.id, characterId: character.id,
          previousGold: character.gold, newGold: character.gold + delta, delta,
          reason: `TROCA ${direction}${data.reason ? `: ${data.reason}` : ''}` }, prisma);
      }
    }
    if (data.itemId) {
      const item = await findItemById(data.itemId, { campaignId, includeInactive: true }, prisma);
      if (!item) throw new ApiError(404, 'Item não encontrado nesta mesa.');
      if (!(await removeInventoryItem(characterId, item.id, data.quantity, prisma))) throw new ApiError(400, 'Quantidade insuficiente no inventário.');
      await addInventoryItem(target.id, item.id, data.quantity, prisma);
      for (const [id, direction] of [[sender.id, `Entregou para ${target.name}`], [target.id, `Recebeu de ${sender.name}`]]) {
        await createInventoryLog({ characterId: id, itemId: item.id, actorUserId: user.id, type: 'TROCA', quantity: data.quantity,
          reason: `${direction}${data.reason ? `: ${data.reason}` : ''}` }, prisma);
      }
    }
    const result = { message: `Transferência para ${target.name} concluída.`, character: await findCharacterById(characterId, campaignId, prisma) };
    await prisma.transferRequest.update({ where: { userId_campaignId_key: identity }, data: { response: JSON.parse(JSON.stringify(result)) } });
    return result;
  });
}
