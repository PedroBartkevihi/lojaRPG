export type ActiveDiscount = {
  id: number;
  name: string;
  percent: number;
  categoryId: number | null;
};

export type AppliedDiscount = {
  id: number;
  name: string;
  percent: number;
};

export type PricedItem = {
  price: number;
  categoryId: number;
};

export type SellableItem = PricedItem & {
  effectiveSellPrice: number | null;
};

export type PriceResult = {
  finalPrice: number;
  discount: AppliedDiscount | null;
};

// Vale o maior desconto que se aplica ao item, sem somar descontos. O desconto
// arredonda para baixo em cobre (o jogador paga o centavo que sobra).
export function priceWithDiscount(item: PricedItem, discounts: readonly ActiveDiscount[]): PriceResult {
  let best: ActiveDiscount | null = null;

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
export function sellPriceWithDiscount(item: SellableItem, discounts: readonly ActiveDiscount[]): number | null {
  if (item.effectiveSellPrice === null) {
    return null;
  }

  return Math.min(item.effectiveSellPrice, priceWithDiscount(item, discounts).finalPrice);
}
