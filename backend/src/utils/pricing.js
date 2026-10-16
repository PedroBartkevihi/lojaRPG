/**
 * @typedef {{ id: number, name: string, percent: number, categoryId: number | null }} ActiveDiscount
 * @typedef {{ price: number, categoryId: number }} PricedItem
 */

// Vale o maior desconto que se aplica ao item, sem somar descontos. O desconto
// arredonda para baixo em cobre (o jogador paga o centavo que sobra).
/**
 * @param {PricedItem} item
 * @param {ActiveDiscount[]} discounts
 * @returns {{ finalPrice: number, discount: { id: number, name: string, percent: number } | null }}
 */
export function priceWithDiscount(item, discounts) {
  /** @type {ActiveDiscount | null} */
  let best = null;

  for (const discount of discounts) {
    if ((discount.categoryId === null || discount.categoryId === item.categoryId) && (!best || discount.percent > best.percent)) {
      best = discount;
    }
  }

  if (!best) {
    return { finalPrice: item.price, discount: null };
  }

  return {
    finalPrice: item.price - Math.floor((item.price * best.percent) / 100),
    discount: { id: best.id, name: best.name, percent: best.percent }
  };
}
