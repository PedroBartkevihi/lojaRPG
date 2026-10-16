/**
 * @typedef {{ id: number, name: string, percent: number, categoryId: number | null }} ActiveDiscount
 * @typedef {{ price: number, categoryId: number }} PricedItem
 * @typedef {PricedItem & { effectiveSellPrice: number | null }} SellableItem
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

// A loja nunca paga mais do que cobraria do personagem agora: com um desconto
// maior que a margem de revenda (mais de 50% na regra padrao), comprar e
// vender de volta daria lucro sem fim.
/**
 * @param {SellableItem} item
 * @param {ActiveDiscount[]} discounts
 * @returns {number | null}
 */
export function sellPriceWithDiscount(item, discounts) {
  if (item.effectiveSellPrice === null) {
    return null;
  }

  return Math.min(item.effectiveSellPrice, priceWithDiscount(item, discounts).finalPrice);
}
