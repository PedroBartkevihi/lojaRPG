import { withTransaction } from '../database/transaction.js';
import { findCharacterById, replaceCharacterGold } from '../models/characterModel.js';
import { createGoldAuditLog } from '../models/goldAuditModel.js';
import { ApiError } from '../utils/ApiError.js';

export async function changeCharacterGold({ actorUserId, characterId, mode, value, reason }) {
  return withTransaction(async (prisma) => {
    const character = await findCharacterById(characterId, prisma);

    if (!character) {
      throw new ApiError(404, 'Personagem nao encontrado.');
    }

    const nextGold = mode === 'set' ? value : character.gold + value;

    if (nextGold < 0) {
      throw new ApiError(400, 'Ouro nao pode ficar negativo.');
    }

    // Se uma compra mudou o ouro depois da leitura, a troca nao acontece e a
    // auditoria nunca registra um valor anterior que ja nao existia.
    if (!(await replaceCharacterGold(character.id, character.gold, nextGold, prisma))) {
      throw new ApiError(409, 'O ouro do personagem mudou durante a alteracao. Tente novamente.');
    }

    const auditLog = await createGoldAuditLog(
      {
        actorUserId,
        characterId: character.id,
        previousGold: character.gold,
        newGold: nextGold,
        delta: nextGold - character.gold,
        reason
      },
      prisma
    );

    return {
      character: await findCharacterById(character.id, prisma),
      auditLog
    };
  });
}
