import { withTransaction } from '../database/transaction.js';
import { createStockMovement } from '../models/catalogModel.js';
import { creditCharacterGold, findCharacterById } from '../models/characterModel.js';
import { createInventoryLog, removeInventoryItem } from '../models/inventoryModel.js';
import { findItemById, incrementItemStock } from '../models/itemModel.js';
import { ApiError } from '../utils/ApiError.js';

async function findOwnCharacter(user, campaignId, characterId, action, prisma) {
  const character = await findCharacterById(characterId, campaignId, prisma);

  if (!character) {
    throw new ApiError(404, 'Personagem não encontrado.');
  }

  if (character.userId !== user.id) {
    throw new ApiError(403, `Você só pode ${action} itens dos seus personagens.`);
  }

  return character;
}

async function findCampaignItem(campaignId, itemId, prisma) {
  const item = await findItemById(itemId, { campaignId, includeInactive: true }, prisma);

  if (!item) {
    throw new ApiError(404, 'Item não encontrado.');
  }

  return item;
}

// A loja paga o preco de venda do item, que volta ao estoque. Tirar do
// inventario so acontece se o personagem ainda tiver as unidades; se faltar,
// a transacao e desfeita (inclusive o credito) e duas vendas simultaneas do
// ultimo item nao pagam duas vezes.
//
// A ordem dos bloqueios e a mesma da compra: personagem, depois inventario e
// estoque. Com a venda travando o inventario primeiro, uma compra e uma venda
// do mesmo personagem ao mesmo tempo esperavam uma pela outra (deadlock) e o
// banco abortava uma delas.
export async function sellItem({ user, campaignId, characterId, itemId, quantity }) {
  return withTransaction(async (prisma) => {
    const character = await findOwnCharacter(user, campaignId, characterId, 'vender', prisma);
    const item = await findCampaignItem(campaignId, itemId, prisma);

    if (item.effectiveSellPrice === null) {
      throw new ApiError(400, `A loja não compra ${item.name}.`);
    }

    const total = item.effectiveSellPrice * quantity;
    await creditCharacterGold(character.id, total, prisma);

    if (!(await removeInventoryItem(character.id, item.id, quantity, prisma))) {
      throw new ApiError(400, `Quantidade insuficiente de ${item.name} no inventário.`);
    }

    const newStock = await incrementItemStock(item.id, quantity, prisma);
    await createStockMovement(
      {
        itemId: item.id,
        actorUserId: user.id,
        previousStock: newStock - quantity,
        newStock,
        reason: `Venda de ${character.name}`
      },
      prisma
    );

    await createInventoryLog(
      {
        characterId: character.id,
        itemId: item.id,
        actorUserId: user.id,
        type: 'VENDA',
        quantity,
        unitPrice: item.effectiveSellPrice
      },
      prisma
    );

    return {
      message: `Venda concluída: ${quantity}x ${item.name} por ${total} ouro.`,
      character: await findCharacterById(character.id, campaignId, prisma)
    };
  });
}

export async function useItem({ user, campaignId, characterId, itemId, quantity, reason }) {
  return withTransaction(async (prisma) => {
    const character = await findOwnCharacter(user, campaignId, characterId, 'usar', prisma);
    const item = await findCampaignItem(campaignId, itemId, prisma);

    if (!(await removeInventoryItem(character.id, item.id, quantity, prisma))) {
      throw new ApiError(400, `Quantidade insuficiente de ${item.name} no inventário.`);
    }

    await createInventoryLog(
      {
        characterId: character.id,
        itemId: item.id,
        actorUserId: user.id,
        type: 'USO',
        quantity,
        reason
      },
      prisma
    );

    return {
      message: `Item usado: ${quantity}x ${item.name}.`,
      character: await findCharacterById(character.id, campaignId, prisma)
    };
  });
}
