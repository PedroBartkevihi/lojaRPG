import { useRef, useState } from 'react';
import ShopSwitch from '../ShopSwitch.jsx';

export default function ShopsTab({ api, shops, reload, showNotice }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [hours, setHours] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  function reset() { setEditing(null); setName(''); setHours(''); setError(''); }
  async function save(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      if (editing) await api.updateShop(editing, { name, hours });
      else await api.createShop({ name, hours });
      reset(); await reload(); showNotice('Vendedor salvo.');
    } catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="content-grid admin-tab">
    <div>{shops.map((shop) => <article className="surface-panel" key={shop.id}>
      <h3>{shop.name}</h3><p>{shop.hours || 'Horário não informado'}</p>
      <ShopSwitch api={api} shopId={shop.id} shopOpen={shop.isOpen} onChanged={reload} showNotice={showNotice} />
      <button className="secondary-action" disabled={busy} onClick={() => { setEditing(shop.id); setName(shop.name); setHours(shop.hours); setError(''); }}>Editar {shop.name}</button>
    </article>)}</div>
    <form className="surface-panel stack-form" onSubmit={save}>
      <h3>{editing ? 'Editar vendedor' : 'Cadastrar vendedor'}</h3>
      <label>Nome do vendedor<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} /></label>
      <label>Horário de atendimento<textarea maxLength={300} value={hours} onChange={(e) => setHours(e.target.value)} disabled={busy} placeholder="Ex.: da alvorada ao pôr do sol" /></label>
      <p>O horário é informativo. O Mestre abre e fecha cada vendedor conforme o tempo da campanha.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="primary-action" disabled={busy}>{busy ? 'Salvando...' : 'Salvar vendedor'}</button>
      {editing && <button type="button" className="secondary-action" disabled={busy} onClick={reset}>Cancelar edição</button>}
    </form>
  </div>;
}
