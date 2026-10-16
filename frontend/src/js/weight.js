// Peso em libras, como no livro do jogador: "2,5 lb".
/**
 * @param {number | null | undefined} pounds
 * @returns {string}
 */
export function formatWeight(pounds) {
  if (pounds === null || pounds === undefined || Number.isNaN(Number(pounds))) {
    return '';
  }

  return `${Number(pounds).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} lb`;
}

// Soma o peso do inventario; itens sem peso contam zero.
/**
 * @param {import('../types').InventoryEntry[]} inventory
 * @returns {number}
 */
export function inventoryWeight(inventory) {
  const total = inventory.reduce((sum, entry) => sum + entry.quantity * (entry.item.weight || 0), 0);
  return Math.round(total * 100) / 100;
}
