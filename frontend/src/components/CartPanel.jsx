import { ShoppingCart, Trash2 } from 'lucide-react';

export default function CartPanel({ cart, setCart, character, onCheckout, disabled }) {
  const total = cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  const canCheckout = cart.length > 0 && character && !disabled;

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
                <strong>{entry.item.name}</strong>
                <span>{entry.item.price} ouro cada</span>
              </div>
              <input
                type="number"
                min="1"
                max={entry.item.stock}
                value={entry.quantity}
                onChange={(event) => changeQuantity(entry.item.id, event.target.value)}
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
        <strong>{total} ouro</strong>
      </div>
      <button className="primary-action full" disabled={!canCheckout} onClick={onCheckout}>
        Finalizar compra
      </button>
    </div>
  );
}
