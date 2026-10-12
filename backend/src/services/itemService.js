import { withCampaignTransaction } from './sessionService.js';
import { createStockMovement } from '../models/catalogModel.js';
import { deactivateItem, replaceItemStock, updateItem } from '../models/itemModel.js';
import { ApiError } from '../utils/ApiError.js';

const STOCK_CHANGED_MESSAGE = 'O estoque do item mudou durante a edição. Recarregue e tente novamente.';

// `existing` e o item lido agora; `expectedStock`, o estoque que o Mestre viu
// ao abrir o formulario. A troca de estoque so acontece se nenhuma compra o
// mudou desde entao; sem isso, salvar o formulario aberto antes de uma compra
// regravaria o estoque antigo e desfaria a venda. Sem `expectedStock` (o
// formulario nao mexeu no estoque), a comparacao e com o valor atual.
export async function saveItemChanges(existing, data, actorUserId, { stockReason, expectedStock } = {}) {
  if (data.shopId !== undefined && data.shopId !== existing.shopId) {
    throw new ApiError(400, 'O vendedor de um item não pode ser alterado. Cadastre uma oferta no outro vendedor.');
  }
  return withCampaignTransaction(existing.campaignId, async (prisma, sessionId) => {
    if (!(await replaceItemStock(existing.id, expectedStock ?? existing.stock, data.stock, prisma))) {
      throw new ApiError(409, STOCK_CHANGED_MESSAGE);
    }

    const item = await updateItem(existing.id, { ...data, campaignId: existing.campaignId }, prisma);

    if (item.stock !== existing.stock) {
      await createStockMovement(
        { sessionId,
          itemId: item.id,
          actorUserId,
          previousStock: existing.stock,
          newStock: item.stock,
          reason: stockReason || 'Ajuste manual de estoque'
        },
        prisma
      );
    }

    return item;
  });
}

export async function removeItem(existing, actorUserId) {
  return withCampaignTransaction(existing.campaignId, async (prisma, sessionId) => {
    if (!(await replaceItemStock(existing.id, existing.stock, 0, prisma))) {
      throw new ApiError(409, STOCK_CHANGED_MESSAGE);
    }

    const item = await deactivateItem(existing.id, prisma);

    if (existing.stock !== item.stock) {
      await createStockMovement(
        { sessionId,
          itemId: item.id,
          actorUserId,
          previousStock: existing.stock,
          newStock: item.stock,
          reason: 'Item removido da loja'
        },
        prisma
      );
    }

    return item;
  });
}
