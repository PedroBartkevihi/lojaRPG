import { withTransaction } from '../database/transaction.js';
import { creditCharacterGold, findCharacterById } from '../models/characterModel.js';
import { createGoldAuditLog } from '../models/goldAuditModel.js';
import { addInventoryItem, createInventoryLog } from '../models/inventoryModel.js';
import { findItemById } from '../models/itemModel.js';
import { ApiError } from '../utils/ApiError.js';

// Divide o ouro entre os personagens escolhidos (`split`) ou da o valor
// inteiro a cada um (`each`). Na divisao, o que nao fecha em partes iguais
// sobra e e informado ao Mestre. Cada credito fica na auditoria de ouro.
export async function giveGold({ actorUserId, campaignId, characterIds, total, mode, reason }) {
  const ids = [...new Set(characterIds)];
  const share = mode === 'split' ? Math.floor(total / ids.length) : total;
  const remainder = mode === 'split' ? total - share * ids.length : 0;

  if (share <= 0) {
    throw new ApiError(400, `${total} de ouro não dá para dividir entre ${ids.length} personagens.`);
  }

  return withTransaction(async (prisma) => {
    const characters = [];

    for (const characterId of ids) {
      const character = await findCharacterById(characterId, campaignId, prisma);

      if (!character) {
        throw new ApiError(404, 'Personagem não encontrado.');
      }

      const newGold = await creditCharacterGold(character.id, share, prisma);
      await createGoldAuditLog(
        {
          actorUserId,
          characterId: character.id,
          previousGold: newGold - share,
          newGold,
          delta: share,
          reason
        },
        prisma
      );
      characters.push({ ...character, gold: newGold });
    }

    const leftover = remainder > 0 ? ` Sobrou ${remainder}.` : '';
    const message =
      characters.length === 1
        ? `${share} de ouro para ${characters[0].name}.${leftover}`
        : `${share} de ouro para cada um dos ${characters.length} personagens.${leftover}`;

    return { message, share, remainder, characters };
  });
}

// O item vem da aventura, nao da loja: o estoque nao muda, e itens fora da
// loja (inativos) tambem podem ser dados.
export async function giveItem({ actorUserId, campaignId, characterId, itemId, quantity, reason }) {
  return withTransaction(async (prisma) => {
    const character = await findCharacterById(characterId, campaignId, prisma);

    if (!character) {
      throw new ApiError(404, 'Personagem não encontrado.');
    }

    const item = await findItemById(itemId, { campaignId, includeInactive: true }, prisma);

    if (!item) {
      throw new ApiError(404, 'Item não encontrado.');
    }

    await addInventoryItem(character.id, item.id, quantity, prisma);
    await createInventoryLog(
      {
        characterId: character.id,
        itemId: item.id,
        actorUserId,
        type: 'RECOMPENSA',
        quantity,
        reason
      },
      prisma
    );

    return { message: `${character.name} recebeu ${quantity}x ${item.name}.` };
  });
}
