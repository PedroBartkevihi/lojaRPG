import { categoryIcon } from '../js/itemVisuals.js';

// Selo redondo com o icone da categoria, na cor da raridade do card.
export default function ItemIcon({ category, size = 22 }) {
  const Icon = categoryIcon(category);

  return (
    <span className="item-icon" aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
