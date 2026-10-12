import { formatMoney } from '../js/money.js';
import { Coins, Plus } from 'lucide-react';
import { rarityTier } from '../js/itemVisuals.js';
import ItemIcon from './ItemIcon.jsx';

export default function ItemCard({ item, onAdd, disabled, readOnly = false }) {
  const unavailable = item.stock <= 0;

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
      {item.imageUrl && <img className="item-image" src={item.imageUrl} alt="" loading="lazy" />}
      <div className="item-card-body">
        <span className="item-category">{item.category}</span>
        <h3>{item.name}</h3>
        <small>{item.shopName}{item.shopOpen === false ? " — fechado" : ""}</small>
        <p>{item.description}</p>
      </div>
      <div className="item-card-footer">
        <strong className="price">
          <Coins size={17} />
          {formatMoney(item.price)}
        </strong>
        {/* O Mestre so ve a vitrine; os itens sao editados no painel dele. */}
        {!readOnly && (
          <button className="add-action" onClick={onAdd} disabled={unavailable || disabled}>
            <Plus size={17} />
            Adicionar
          </button>
        )}
      </div>
    </article>
  );
}
