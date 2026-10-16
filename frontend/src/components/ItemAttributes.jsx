import { formatWeight } from '../js/weight.js';

// Atributos do livro que o Mestre preencheu: peso, dano, CA e sintonizacao.
export default function ItemAttributes({ item }) {
  const attributes = [
    item.weight !== null && item.weight !== undefined && { key: 'peso', label: formatWeight(item.weight) },
    item.damage && { key: 'dano', label: item.damage },
    item.armorClass && { key: 'ca', label: `CA ${item.armorClass}` },
    item.requiresAttunement && { key: 'sintonia', label: 'Exige sintonização' }
  ].filter(Boolean);

  if (attributes.length === 0) {
    return null;
  }

  return (
    <ul className="item-attributes" aria-label="Atributos do item">
      {attributes.map((attribute) => (
        <li key={attribute.key}>{attribute.label}</li>
      ))}
    </ul>
  );
}
