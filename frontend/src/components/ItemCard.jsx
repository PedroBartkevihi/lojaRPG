import { Coins, Plus } from 'lucide-react';
import { rarityTier } from '../js/itemVisuals.js';
import ItemIcon from './ItemIcon.jsx';

export default function ItemCard({ item, onAdd, disabled }) {
  const unavailable = item.stock <= 0 || disabled;

  return (
    <article className="item-card" data-rarity-tier={rarityTier(item.rarityRank)}>
      <div className="item-card-header">
        <ItemIcon category={item.category} />
        <div className="item-card-tags">
          <span className="rarity">{item.rarity}</span>
          <span className={item.stock > 0 ? 'stock' : 'stock empty'}>
            {item.stock > 0 ? `${item.stock} em estoque` : 'Esgotado'}
          </span>
        </div>
      </div>
      {item.imageUrl && <img className="item-image" src={item.imageUrl} alt="" />}
      <div className="item-card-body">
        <span className="item-category">{item.category}</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>
      <div className="item-card-footer">
        <strong className="price">
          <Coins size={17} />
          {item.price} ouro
        </strong>
        <button className="add-action" onClick={onAdd} disabled={unavailable}>
          <Plus size={17} />
          {disabled ? 'Gerenciar' : 'Adicionar'}
        </button>
      </div>
    </article>
  );
}
