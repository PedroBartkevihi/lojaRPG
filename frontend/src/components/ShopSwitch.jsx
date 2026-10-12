import { useRef, useState } from 'react';

export default function ShopSwitch({ api, shopId, shopOpen = true, onChanged, showNotice }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await api.updateShop(shopId, { isOpen: !shopOpen });
      await onChanged();
      showNotice(shopOpen ? 'Loja fechada para compras e vendas.' : 'Loja aberta.');
    } catch (error) {
      showNotice(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <div className="surface-panel shop-status">
    <p role="status">{shopOpen ? 'Loja aberta' : 'Loja fechada'} - o catálogo continua visível.</p>
    <button className="secondary-action" disabled={busy} onClick={toggle}>
      {busy ? 'Salvando...' : shopOpen ? 'Fechar loja' : 'Abrir loja'}
    </button>
  </div>;
}
