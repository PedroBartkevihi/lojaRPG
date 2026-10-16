import { useEffect, useState } from 'react';
import { BadgePercent } from 'lucide-react';

export function describeDiscount(discount) {
  const scope = discount.category ? ` em ${discount.category}` : ' em tudo';
  const owner = discount.characterName ? ` para ${discount.characterName}` : '';
  return `${discount.name}: ${discount.percent}%${scope}${owner}`;
}

// Faixa da loja com os descontos ativos: os eventos da mesa e os do
// personagem ativo.
export default function DiscountBanner({ api, liveKey, characterId }) {
  const [discounts, setDiscounts] = useState([]);

  useEffect(() => {
    let current = true;
    api.listDiscounts?.()
      .then((data) => { if (current) setDiscounts(data.discounts || []); })
      .catch(() => {});
    return () => { current = false; };
  }, [api, liveKey]);

  const visible = discounts.filter((discount) => discount.isActive && (!discount.characterId || discount.characterId === characterId));

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="surface-panel discount-banner" role="status">
      <BadgePercent size={20} />
      <ul>
        {visible.map((discount) => (
          <li key={discount.id}>{describeDiscount(discount)}</li>
        ))}
      </ul>
    </div>
  );
}
