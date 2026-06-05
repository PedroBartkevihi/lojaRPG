import { Plus, ShoppingBag } from 'lucide-react';

export default function ItemCard({ item, onAdd, disabled }) {
  const unavailable = item.stock <= 0 || disabled;

  return (
    <article className="item-card">
      <div className="item-card-header">
        <span className="rarity">{item.rarity}</span>
        <span className={item.stock > 0 ? 'stock' : 'stock empty'}>{item.stock} em estoque</span>
      </div>
      {item.imageUrl && <img className="item-image" src={item.imageUrl} alt="" />}
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <div className="item-card-footer">
        <span className="category-pill">
          <ShoppingBag size={15} />
          {item.category}
        </span>
        <strong>{item.price} ouro</strong>
      </div>
      <button className="primary-action full" onClick={onAdd} disabled={unavailable}>
        <Plus size={17} />
        {disabled ? 'Gerenciar' : 'Adicionar'}
      </button>
    </article>
  );
}
