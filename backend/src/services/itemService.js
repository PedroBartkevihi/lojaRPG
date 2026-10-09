import { withTransaction } from '../database/transaction.js';
import { createStockMovement } from '../models/catalogModel.js';
import { deactivateItem, replaceItemStock, updateItem } from '../models/itemModel.js';
import { ApiError } from '../utils/ApiError.js';

const STOCK_CHANGED_MESSAGE = 'O estoque do item mudou durante a edição. Recarregue e tente novamente.';

// `existing` e o item lido antes da edicao. A troca de estoque confere que
// nenhuma compra alterou esse valor no meio do caminho; sem isso, salvar so o
// preco regravaria o estoque antigo e desfaria a compra.
export async function saveItemChanges(existing, data, actorUserId, stockReason) {
  return withTransaction(async (prisma) => {
    if (!(await replaceItemStock(existing.id, existing.stock, data.stock, prisma))) {
      throw new ApiError(409, STOCK_CHANGED_MESSAGE);
    }

    const item = await updateItem(existing.id, { ...data, campaignId: existing.campaignId }, prisma);

    if (item.stock !== existing.stock) {
      await createStockMovement(
        {
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
  return withTransaction(async (prisma) => {
    if (!(await replaceItemStock(existing.id, existing.stock, 0, prisma))) {
      throw new ApiError(409, STOCK_CHANGED_MESSAGE);
    }

    const item = await deactivateItem(existing.id, prisma);

    if (existing.stock !== item.stock) {
      await createStockMovement(
        {
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
