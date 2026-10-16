import { formatMoney } from '../js/money.js';
import { formatWeight } from '../js/weight.js';
import { ShoppingCart, Trash2 } from 'lucide-react';

export default function CartPanel({ cart, setCart, character, onCheckout, submitting = false, shopOpen = true }) {
  const total = cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  const canCheckout = shopOpen && cart.length > 0 && character && !submitting;
  // So um aviso: a compra nao e bloqueada (a regra de carga e da mesa).
  const cartWeight = cart.reduce((sum, entry) => sum + entry.quantity * (entry.item.weight || 0), 0);
  const loadAfter = Math.round(((character?.carriedWeight || 0) + cartWeight) * 100) / 100;
  const overCapacity = Boolean(character?.carryCapacity) && cartWeight > 0 && loadAfter > character.carryCapacity;

  function changeQuantity(itemId, quantity) {
    setCart((current) =>
      current
        .map((entry) =>
          entry.item.id === itemId
            ? { ...entry, quantity: Math.max(1, Math.min(entry.item.stock, Number(quantity))) }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  }

  function removeItem(itemId) {
    setCart((current) => current.filter((entry) => entry.item.id !== itemId));
  }

  return (
    <div className="surface-panel">
      <div className="panel-title">
        <ShoppingCart size={20} />
        <h3>Carrinho</h3>
      </div>
      {cart.length === 0 ? (
        <p className="empty-state">Nenhum item selecionado.</p>
      ) : (
        <div className="cart-list">
          {cart.map((entry) => (
            <div className="cart-line" key={entry.item.id}>
              <div>
                <strong>{entry.item.name}</strong><small>{entry.item.shopName}</small>
                <span>{formatMoney(entry.item.price)} cada</span>
              </div>
              <input
                type="number"
                min="1"
                max={entry.item.stock}
                value={entry.quantity}
                onChange={(event) => changeQuantity(entry.item.id, event.target.value)}
                aria-label={`Quantidade de ${entry.item.name}`}
              />
              <button className="icon-button danger" onClick={() => removeItem(entry.item.id)} title="Remover">
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="cart-total">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      {overCapacity && (
        <p className="form-hint carry-warning" role="status">
          Com esta compra, {character.name} fica com {formatWeight(loadAfter)}, acima da capacidade de carga (
          {formatWeight(character.carryCapacity)}).
        </p>
      )}
      <button className="primary-action full" disabled={!canCheckout} onClick={onCheckout}>
        {submitting ? 'Finalizando...' : 'Finalizar compra'}
      </button>
    </div>
  );
}
