import { useEffect, useState } from 'react';
import { Coins, Search, ShoppingCart } from 'lucide-react';
import CartPanel from '../components/CartPanel.jsx';
import CharacterPanel from '../components/CharacterPanel.jsx';
import ItemCard from '../components/ItemCard.jsx';

export default function ShopPage({
  api,
  user,
  character,
  characters = [],
  selectedCharacterId,
  onSelectCharacter,
  onRefreshSession,
  showNotice
}) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMaster = user.role === 'MESTRE';

  async function loadItems() {
    setLoading(true);
    setError('');

    try {
      const data = await api.listItems({ search, category });
      setItems(data.items);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [search, category]);

  useEffect(() => {
    api
      .listItems()
      .then((data) => setCategories([...new Set(data.items.map((item) => item.category))].sort()))
      .catch((requestError) => setError(requestError.message));
  }, [api]);

  function addToCart(item) {
    if (isMaster) {
      showNotice('Mestre gerencia a loja pelo painel administrativo.');
      return;
    }

    if (!character) {
      showNotice('Crie um personagem antes de comprar.');
      return;
    }

    setCart((current) => {
      const existing = current.find((entry) => entry.item.id === item.id);
      const currentQuantity = existing?.quantity || 0;

      if (currentQuantity >= item.stock) {
        showNotice('Estoque maximo deste item ja esta no carrinho.');
        return current;
      }

      if (existing) {
        return current.map((entry) =>
          entry.item.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }

      return [...current, { item, quantity: 1 }];
    });
  }

  async function checkout() {
    try {
      const payload = {
        characterId: character.id,
        items: cart.map((entry) => ({
          itemId: entry.item.id,
          quantity: entry.quantity
        }))
      };
      const data = await api.createPurchase(payload);
      setCart([]);
      await loadItems();
      await onRefreshSession();
      showNotice(data.message);
    } catch (requestError) {
      showNotice(requestError.message);
    }
  }

  return (
    <section className="content-grid">
      <div className="shop-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Itens disponiveis</p>
            <h2>Loja da campanha</h2>
          </div>
          {!isMaster && character && (
            <span className="gold-badge">
              <Coins size={18} />
              {character.gold} ouro
            </span>
          )}
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar item"
            />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {itemCategory}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p className="empty-state">Carregando itens...</p>
        ) : (
          <div className="items-grid">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onAdd={() => addToCart(item)} disabled={isMaster} />
            ))}
            {items.length === 0 && <p className="empty-state">Nenhum item encontrado.</p>}
          </div>
        )}
      </div>

      <aside className="side-column">
        {!isMaster ? (
          <>
            <CharacterPanel
              api={api}
              character={character}
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={onSelectCharacter}
              onRefreshSession={onRefreshSession}
              showNotice={showNotice}
            />
            <CartPanel cart={cart} setCart={setCart} character={character} onCheckout={checkout} disabled={false} />
          </>
        ) : (
          <div className="surface-panel">
            <ShoppingCart size={20} />
            <p>Mestres podem criar itens, ajustar ouro e ver compras no painel Mestre.</p>
          </div>
        )}
      </aside>
    </section>
  );
}
