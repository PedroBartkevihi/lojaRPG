import { formatMoney, parseMoney } from '../js/money.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Search, ShoppingCart, X } from 'lucide-react';
import CartPanel from '../components/CartPanel.jsx';
import CharacterPanel from '../components/CharacterPanel.jsx';
import ItemCard from '../components/ItemCard.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';


const MAX_PRICE_FILTER = 100000000;
export default function ShopPage({
  api,
  liveKey,
  isMaster,
  character,
  characters = [],
  selectedCharacterId,
  onSelectCharacter,
  onRefreshSession,
  showNotice
}) {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  // A busca so sai 300 ms depois da ultima tecla, e nao a cada letra.
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [rarities, setRarities] = useState([]);
  const [rarity, setRarity] = useState('');
  // Faixa de preco digitada em PO; vai para a API em PC junto com a busca.
  const [priceText, setPriceText] = useState({ min: '', max: '' });
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  // Trava sincrona: dois cliques seguidos chegam antes de o botao redesenhar
  // desativado, e cada um faria uma compra.
  const checkoutLock = useRef(false);
  const checkoutIntent = useRef(null);
  // Numero da busca mais recente: com a rede lenta, uma resposta antiga pode
  // chegar depois da atual e nao deve substitui-la.
  const latestItemsRequest = useRef(0);

  const selectedShop = shops.find((shop) => shop.id === Number(shopId));
  const cartOpen = cart.every((entry) => shops.some((shop) => shop.id === entry.item.shopId && shop.isOpen));
  const cartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const cartTotal = cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);

  // Sem "Carregando" nas recargas: a lista atual fica na tela ate a nova
  // chegar, e o carrinho passa a mostrar o preco e o estoque atualizados.
  const loadItems = useCallback(async () => {
    const requestId = latestItemsRequest.current + 1;
    latestItemsRequest.current = requestId;
    const isLatest = () => requestId === latestItemsRequest.current;
    setError('');

    try {
      const data = await api.listItems({
        search: searchTerm,
        category,
        rarity,
        shopId,
        minPrice: priceRange.min,
        maxPrice: priceRange.max
      });

      if (!isLatest()) {
        return;
      }

      const freshItems = new Map(data.items.map((item) => [item.id, item]));
      setItems(data.items);
      setCart((current) =>
        current.map((entry) => (freshItems.has(entry.item.id) ? { ...entry, item: freshItems.get(entry.item.id) } : entry))
      );
    } catch (requestError) {
      if (isLatest()) {
        setError(requestError.message);
      }
    } finally {
      if (isLatest()) {
        setLoading(false);
      }
    }
  }, [api, searchTerm, category, rarity, shopId, priceRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Um valor que nao vira PC inteiro (ou a faixa invertida) nao vai para a
  // API: a lista atual fica e o aviso explica o porque.
  const priceMin = priceText.min === '' ? '' : parseMoney(priceText.min, 'PO');
  const priceMax = priceText.max === '' ? '' : parseMoney(priceText.max, 'PO');
  const invalidPrice = [priceMin, priceMax].some((value) => value !== '' && (!Number.isSafeInteger(value) || value < 0));
  // O mesmo teto da API (100.000.000 PC), dito em PO.
  const tooHighPrice = !invalidPrice && [priceMin, priceMax].some((value) => value !== '' && value > MAX_PRICE_FILTER);
  const invertedPrice = !invalidPrice && priceMin !== '' && priceMax !== '' && priceMin > priceMax;
  const priceError = invalidPrice
    ? 'Use um valor em PO, como 10 ou 2,5.'
    : tooHighPrice
      ? 'O preço vai até 1.000.000 PO.'
      : invertedPrice
      ? 'O preço mínimo é maior que o máximo.'
      : '';

  useEffect(() => {
    if (priceError) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setPriceRange((current) => (current.min === priceMin && current.max === priceMax ? current : { min: priceMin, max: priceMax })),
      300
    );
    return () => window.clearTimeout(timer);
  }, [priceMin, priceMax, priceError]);

  const filtering = Boolean(search || category || rarity || shopId || priceText.min || priceText.max);

  function clearFilters() {
    setSearch('');
    setCategory('');
    setRarity('');
    setShopId('');
    setPriceText({ min: '', max: '' });
  }

  useEffect(() => {
    loadItems();
  }, [loadItems, liveKey]);

  useEffect(() => {
    api
      .listCategories()
      .then((data) => setCategories(data.categories.map((entry) => entry.name).sort()))
      .catch((requestError) => setError(requestError.message));
  }, [api, liveKey]);

  useEffect(() => {
    let current = true;
    api.listRarities().then((data) => {
      if (current) setRarities([...data.rarities].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)));
    }).catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [api, liveKey]);

  useEffect(() => {
    let current = true;
    api.listShops().then((data) => { if (current) setShops(data.shops); })
      .catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [api, liveKey]);

  function addToCart(item) {
    if (!shops.some((shop) => shop.id === item.shopId && shop.isOpen)) return;
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
        showNotice('Estoque máximo deste item já está no carrinho.');
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
    if (!cartOpen || checkoutLock.current) {
      return;
    }

    checkoutLock.current = true;
    setCheckingOut(true);

    try {
      const payload = {
        characterId: character.id,
        items: cart.map((entry) => ({
          itemId: entry.item.id,
          quantity: entry.quantity
        }))
      };
      const fingerprint = JSON.stringify(payload);
      if (checkoutIntent.current?.fingerprint !== fingerprint) {
        checkoutIntent.current = { fingerprint, key: crypto.randomUUID() };
      }
      payload.idempotencyKey = checkoutIntent.current.key;
      const data = await api.createPurchase(payload);
      checkoutIntent.current = null;
      setCart([]);
      await loadItems();
      await onRefreshSession();
      showNotice(data.message);
    } catch (requestError) {
      showNotice(requestError.message);
    } finally {
      checkoutLock.current = false;
      setCheckingOut(false);
    }
  }

  return (
    <section className="content-grid">
      <div className="shop-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Itens disponíveis</p>
            <h2>Loja da campanha</h2>
          </div>
          {!isMaster && character && (
            <span className="gold-badge">
              <Coins size={18} />
              {formatMoney(character.gold)}
            </span>
          )}
        </div>

        <div className="toolbar shop-filters">
          <label className="search-field">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar item"
              aria-label="Buscar item"
            />
          </label>
          <select aria-label="Filtrar por vendedor" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="">Todos vendedores</option>{shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}{shop.isOpen ? '' : ' (fechado)'}</option>)}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {itemCategory}
              </option>
            ))}
          </select>
          <select value={rarity} onChange={(event) => setRarity(event.target.value)} aria-label="Filtrar por raridade">
            <option value="">Todas as raridades</option>
            {rarities.map((entry) => (
              <option key={entry.id} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
          <div className="price-filter" role="group" aria-label="Faixa de preço em PO">
            <input
              inputMode="decimal"
              value={priceText.min}
              onChange={(event) => setPriceText((current) => ({ ...current, min: event.target.value }))}
              placeholder="De (PO)"
              aria-label="Preço mínimo em PO"
              aria-invalid={Boolean(priceError) || undefined}
            />
            <input
              inputMode="decimal"
              value={priceText.max}
              onChange={(event) => setPriceText((current) => ({ ...current, max: event.target.value }))}
              placeholder="Até (PO)"
              aria-label="Preço máximo em PO"
              aria-invalid={Boolean(priceError) || undefined}
            />
          </div>
          {filtering && (
            <button type="button" className="text-action clear-filters" onClick={clearFilters}>
              <X size={16} />
              Limpar filtros
            </button>
          )}
        </div>
        {priceError && <p className="form-error" role="alert">{priceError}</p>}

        {selectedShop && <p className="surface-panel" role="status">{selectedShop.name}: {selectedShop.isOpen ? 'aberto' : 'fechado para compras e vendas'}. {selectedShop.hours || 'Horário não informado'}</p>}
        {!cartOpen && <p role="status">Há um vendedor fechado no carrinho. Remova seus itens ou aguarde a reabertura.</p>}
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <SkeletonCards count={6} />
        ) : (
          <div className="items-grid">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onAdd={() => addToCart(item)} readOnly={isMaster} disabled={!shops.some((shop) => shop.id === item.shopId && shop.isOpen)} />
            ))}
            {items.length === 0 && (
              <p className="empty-state">{filtering ? 'Nenhum item com esses filtros.' : 'Nenhum item encontrado.'}</p>
            )}
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
            <div id="carrinho">
              <CartPanel
                cart={cart}
                setCart={setCart}
                character={character}
                onCheckout={checkout}
                submitting={checkingOut}
                shopOpen={cartOpen}
              />
            </div>
          </>
        ) : (
          <div className="surface-panel">
            <ShoppingCart size={20} />
            <p>Mestres podem criar itens, ajustar saldo e ver compras no painel Mestre.</p>
          </div>
        )}
      </aside>

      {/* No celular o carrinho fica depois do catalogo; esta barra leva ate ele. */}
      {!isMaster && cartCount > 0 && (
        <div className="mobile-cart-bar">
          <span>
            {cartCount} {cartCount === 1 ? 'item' : 'itens'} - {formatMoney(cartTotal)}
          </span>
          <button
            className="primary-action"
            onClick={() => document.getElementById('carrinho')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <ShoppingCart size={17} />
            Ver carrinho
          </button>
        </div>
      )}
    </section>
  );
}
