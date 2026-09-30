import {
  ArrowDownRight,
  ArrowRight,
  Check,
  CircleHelp,
  Instagram,
  Loader2,
  Menu,
  Minus,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import {
  getGetShopifyCartQueryKey,
  getListShopifyProductsQueryKey,
  useAddShopifyCartLines,
  useCreateShopifyCart,
  useGetShopifyCart,
  useListShopifyProducts,
  useRemoveShopifyCartLine,
  useUpdateShopifyCartLine,
  type ShopifyCart,
  type ShopifyProduct,
  type ShopifyProductVariant,
} from '@workspace/api-client-react';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type CollectionFilter = 'Everything' | 'Objects' | 'Guides' | 'Wear';

const filters: CollectionFilter[] = ['Everything', 'Objects', 'Guides', 'Wear'];

function money(value: number, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function productKind(product: ShopifyProduct): Exclude<CollectionFilter, 'Everything'> {
  const text = `${product.title} ${product.description}`.toLowerCase();
  if (text.includes('guide') || text.includes('book') || text.includes('toolkit') || text.includes('digital')) return 'Guides';
  if (text.includes('wear') || text.includes('tee') || text.includes('shirt') || text.includes('sweat') || text.includes('cap')) return 'Wear';
  return 'Objects';
}

function ProductVisual({ product, compact = false }: { product: ShopifyProduct; compact?: boolean }) {
  const colors = ['#e9b5bb', '#d8d9e7', '#c8a993', '#e4d8bc', '#b9ced0'];
  const color = colors[product.title.length % colors.length];
  return (
    <div className={`relative overflow-hidden ${compact ? 'aspect-[1.15]' : 'aspect-[.92]'}`} style={{ backgroundColor: color }}>
      {product.image?.url ? (
        <img
          src={product.image.url}
          alt={product.image.altText || product.title}
          className="h-full w-full object-cover"
          data-testid={`img-product-${product.id}`}
        />
      ) : (
        <div className="absolute inset-0 p-5">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-black/15" />
          <div className="absolute bottom-5 left-5 max-w-[75%] font-editorial text-3xl leading-[.94] text-[#23191b] md:text-4xl">
            {product.title}
          </div>
          <div className="absolute bottom-5 right-5 font-mono-brand text-[9px] uppercase tracking-[.18em] text-[#23191b]/60">DV / 0{(product.title.length % 8) + 1}</div>
        </div>
      )}
      {!compact && <div className="absolute left-3 top-3 bg-[#f8f0e5] px-2 py-1 font-mono-brand text-[9px] uppercase tracking-[.18em] text-[#23191b]">Dorévielle studio</div>}
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  pending,
}: {
  product: ShopifyProduct;
  onAdd: (product: ShopifyProduct, variant: ShopifyProductVariant) => void;
  pending: boolean;
}) {
  const variant = product.variants.find((item) => item.availableForSale) || product.variants[0];
  return (
    <article className="product-card group" data-testid={`card-product-${product.id}`}>
      <div className="relative">
        <ProductVisual product={product} />
        <button
          type="button"
          disabled={!variant?.availableForSale || pending}
          onClick={() => variant && onAdd(product, variant)}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#f8f0e5] text-[#23191b] shadow-sm transition hover:bg-[#23191b] hover:text-[#f8f0e5] disabled:cursor-not-allowed disabled:opacity-60"
          data-testid={`button-add-product-${product.id}`}
          aria-label={`Add ${product.title} to bag`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" strokeWidth={1.5} />}
        </button>
      </div>
      <div className="flex items-start justify-between gap-3 pt-4">
        <div>
          <p className="mb-1 font-mono-brand text-[9px] uppercase tracking-[.2em] text-[#6f5a5a]">{productKind(product)}</p>
          <h3 className="font-editorial text-[22px] leading-tight text-[#23191b]" data-testid={`text-product-title-${product.id}`}>{product.title}</h3>
          <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-[#6f5a5a]">{product.description}</p>
        </div>
        <p className="whitespace-nowrap font-mono-brand text-[11px] text-[#23191b]" data-testid={`text-product-price-${product.id}`}>{money(product.price, product.currencyCode)}</p>
      </div>
    </article>
  );
}

function CartDrawer({
  open,
  cart,
  cartLoading,
  cartError,
  onRetry,
  busyLine,
  onClose,
  onUpdate,
  onRemove,
  onCheckout,
}: {
  open: boolean;
  cart: ShopifyCart | undefined;
  cartLoading: boolean;
  cartError: boolean;
  onRetry: () => void;
  busyLine: string | null;
  onClose: () => void;
  onUpdate: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  onCheckout: () => void;
}) {
  const lines = cart?.lines || [];
  return (
    <>
      {open && <button aria-label="Close shopping bag" className="fixed inset-0 z-40 cursor-default bg-[#23191b]/35 backdrop-blur-[2px]" onClick={onClose} data-testid="button-close-cart-overlay" />}
      <aside className={`cart-drawer fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[440px] flex-col bg-[#f8f0e5] p-5 text-[#23191b] shadow-2xl sm:p-7 ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-label="Shopping bag">
        <header className="flex items-center justify-between border-b border-[#23191b]/15 pb-5">
          <div>
            <p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-[#6f5a5a]">Your edit</p>
            <h2 className="font-editorial text-3xl">The bag <span className="text-[#d58e99]">/</span> {lines.reduce((total, line) => total + line.quantity, 0)}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[#23191b]/20 p-2 transition hover:bg-[#edc3c8]" aria-label="Close shopping bag" data-testid="button-close-cart"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto py-5">
          {cartLoading && <div className="space-y-5" data-testid="status-cart-loading"><div className="h-24 animate-pulse bg-[#edc3c8]/55" /><div className="h-24 animate-pulse bg-[#edc3c8]/35" /></div>}
          {cartError && <div className="flex h-full flex-col items-center justify-center text-center" data-testid="status-cart-error"><CircleHelp className="mb-4 h-8 w-8 stroke-[1]" /><p className="font-editorial text-2xl">The bag is out of reach.</p><p className="mt-2 max-w-[230px] text-sm text-[#6f5a5a]">A quick refresh should bring it back.</p><button type="button" onClick={onRetry} className="mt-5 border border-[#23191b] px-4 py-2 font-mono-brand text-[10px] uppercase tracking-[.16em]" data-testid="button-retry-cart">Try again</button></div>}
          {!cartLoading && !cartError && !cart && <div className="flex h-full flex-col items-center justify-center text-center"><ShoppingBag className="mb-4 h-8 w-8 stroke-[1]" /><p className="font-editorial text-2xl">Your bag is waiting.</p><p className="mt-2 max-w-[230px] text-sm text-[#6f5a5a]">Pick something that makes the workday feel more like yours.</p></div>}
          {cart && lines.length === 0 && <div className="flex h-full flex-col items-center justify-center text-center"><ShoppingBag className="mb-4 h-8 w-8 stroke-[1]" /><p className="font-editorial text-2xl">A quiet little bag.</p><p className="mt-2 max-w-[230px] text-sm text-[#6f5a5a]">Nothing here yet. The good things are just below.</p></div>}
          <div className="space-y-5">
            {lines.map((line) => (
              <div key={line.id} className="flex gap-4" data-testid={`row-cart-line-${line.id}`}>
                <div className="h-24 w-20 shrink-0 overflow-hidden bg-[#e9b5bb]">
                  {line.image?.url ? <img src={line.image.url} alt={line.title} className="h-full w-full object-cover" data-testid={`img-cart-line-${line.id}`} /> : <div className="p-2 font-editorial text-lg leading-none">{line.title}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div><h3 className="font-editorial text-xl leading-none">{line.title}</h3><p className="mt-1 text-xs text-[#6f5a5a]">{line.variantTitle}</p></div>
                    <p className="font-mono-brand text-[11px]">{money(line.price * line.quantity, line.currencyCode)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center border border-[#23191b]/25">
                      <button type="button" onClick={() => onUpdate(line.id, Math.max(1, line.quantity - 1))} disabled={busyLine === line.id || line.quantity <= 1} className="p-1.5 disabled:opacity-40" aria-label="Decrease quantity" data-testid={`button-decrease-${line.id}`}><Minus className="h-3 w-3" /></button>
                      <span className="min-w-7 text-center font-mono-brand text-[10px]" data-testid={`text-quantity-${line.id}`}>{busyLine === line.id ? '...' : line.quantity}</span>
                      <button type="button" onClick={() => onUpdate(line.id, Math.min(99, line.quantity + 1))} disabled={busyLine === line.id || line.quantity >= 99} className="p-1.5 disabled:opacity-40" aria-label="Increase quantity" data-testid={`button-increase-${line.id}`}><Plus className="h-3 w-3" /></button>
                    </div>
                    <button type="button" onClick={() => onRemove(line.id)} disabled={busyLine === line.id} className="font-mono-brand text-[9px] uppercase tracking-[.16em] underline underline-offset-4 opacity-65 transition hover:opacity-100 disabled:opacity-40" data-testid={`button-remove-${line.id}`}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {cart && lines.length > 0 && <footer className="border-t border-[#23191b]/15 pt-5">
          <div className="mb-4 flex items-baseline justify-between"><span className="font-mono-brand text-[10px] uppercase tracking-[.18em] text-[#6f5a5a]">Subtotal</span><strong className="font-editorial text-3xl" data-testid="text-cart-subtotal">{money(cart.subtotal, cart.currencyCode)}</strong></div>
          <button type="button" onClick={onCheckout} className="flex w-full items-center justify-between bg-[#23191b] px-5 py-4 text-left text-[#f8f0e5] transition hover:bg-[#c87987]" data-testid="button-checkout"><span className="font-mono-brand text-[10px] uppercase tracking-[.2em]">Continue to Shopify checkout</span><ArrowRight className="h-4 w-4" /></button>
          <p className="mt-3 text-center text-[10px] text-[#6f5a5a]">Secure payment and shipping are handled by Shopify.</p>
        </footer>}
      </aside>
    </>
  );
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed bottom-5 right-5 z-30">
      {open && <div className="chat-panel mb-3 w-[min(calc(100vw-2rem),330px)] border border-[#23191b]/15 bg-[#f8f0e5] p-5 text-[#23191b] shadow-xl" data-testid="panel-chat">
        <div className="mb-5 flex items-start justify-between"><div><p className="font-mono-brand text-[9px] uppercase tracking-[.2em] text-[#6f5a5a]">Dorévielle desk</p><h3 className="mt-1 font-editorial text-2xl">What are you building?</h3></div><button type="button" className="rounded-full p-1 hover:bg-[#edc3c8]" onClick={() => setOpen(false)} aria-label="Close chat" data-testid="button-close-chat"><X className="h-4 w-4" /></button></div>
        {sent ? <div className="border border-[#23191b]/15 bg-[#edc3c8]/35 p-4"><Check className="mb-2 h-5 w-5" /><p className="font-editorial text-xl">Message received.</p><p className="mt-1 text-xs text-[#6f5a5a]">A real human will write back soon.</p></div> : <><p className="mb-4 text-sm leading-relaxed text-[#6f5a5a]">Ask us about fit, materials, shipping, or the best object for your desk.</p><div className="flex items-end gap-2 border-b border-[#23191b]/40 pb-2"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && message.trim()) setSent(true); }} placeholder="Type your question..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6f5a5a]/70" data-testid="input-chat-message" /><button type="button" disabled={!message.trim()} onClick={() => setSent(true)} className="disabled:opacity-30" aria-label="Send chat message" data-testid="button-send-chat"><Send className="h-4 w-4" /></button></div></>}
      </div>}
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full bg-[#edc3c8] px-4 py-3 text-[#23191b] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#e3abb4]" data-testid="button-open-chat"><CircleHelp className="h-4 w-4" /><span className="font-mono-brand text-[10px] uppercase tracking-[.15em]">{open ? 'Close desk' : 'Talk to us'}</span></button>
    </div>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [showLoadingScreen, setShowLoadingScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const lastVisit = Number(window.localStorage.getItem('dorevielle-last-visit') || 0);
    return !lastVisit || Date.now() - lastVisit >= 60 * 60 * 1000;
  });
  const productsQuery = useListShopifyProducts({ first: 50 }, { query: { queryKey: getListShopifyProductsQueryKey({ first: 50 }) } });
  const [cartId, setCartId] = useState(() => typeof window === 'undefined' ? '' : window.localStorage.getItem('dorevielle-cart-id') || '');
  const cartQuery = useGetShopifyCart(cartId || 'not-created', { query: { enabled: Boolean(cartId), queryKey: getGetShopifyCartQueryKey(cartId || 'not-created') } });
  const createCart = useCreateShopifyCart();
  const addLines = useAddShopifyCartLines();
  const updateLine = useUpdateShopifyCartLine();
  const removeLineMutationHook = useRemoveShopifyCartLine();
  const [cartOpen, setCartOpen] = useState(false);
  const [filter, setFilter] = useState<CollectionFilter>('Everything');
  const [search, setSearch] = useState('');
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!showLoadingScreen) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem('dorevielle-last-visit', String(Date.now()));
      setShowLoadingScreen(false);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [showLoadingScreen]);

  const products = productsQuery.data || [];
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesFilter = filter === 'Everything' || productKind(product) === filter;
    const matchesSearch = `${product.title} ${product.description}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [filter, products, search]);
  const cart = cartQuery.data;
  const cartCount = cart?.lines.reduce((total, line) => total + line.quantity, 0) || 0;

  function saveCart(next: ShopifyCart) {
    queryClient.setQueryData(getGetShopifyCartQueryKey(next.id), next);
    if (next.id !== cartId) {
      setCartId(next.id);
      window.localStorage.setItem('dorevielle-cart-id', next.id);
    }
  }

  function addToBag(product: ShopifyProduct, variant: ShopifyProductVariant) {
    setBusyProduct(product.id);
    setNotice(`${product.title} is joining your bag.`);
    if (!cartId) {
      createCart.mutate({ data: { lines: [{ merchandiseId: variant.id, quantity: 1 }] } }, {
        onSuccess: (next) => { saveCart(next); setCartOpen(true); setBusyProduct(null); },
        onError: () => { setNotice('We could not open your bag. Please try once more.'); setBusyProduct(null); },
      });
      return;
    }
    addLines.mutate({ cartId, data: { lines: [{ merchandiseId: variant.id, quantity: 1 }] } }, {
      onSuccess: (next) => { saveCart(next); setCartOpen(true); setBusyProduct(null); },
      onError: () => { setNotice('That one did not make it into the bag. Please try again.'); setBusyProduct(null); },
    });
  }

  function updateQuantity(lineId: string, quantity: number) {
    if (!cartId) return;
    setBusyLine(lineId);
    updateLine.mutate({ cartId, lineId, data: { quantity } }, { onSuccess: (next) => { saveCart(next); setBusyLine(null); }, onError: () => { setNotice('Quantity could not be updated.'); setBusyLine(null); } });
  }

  function removeLine(lineId: string) {
    if (!cartId) return;
    setBusyLine(lineId);
    removeLineMutationHook.mutate({ cartId, lineId }, { onSuccess: (next) => { saveCart(next); setBusyLine(null); }, onError: () => { setNotice('That line could not be removed.'); setBusyLine(null); } });
  }

  return (
    <div className="grain min-h-screen overflow-x-hidden bg-[#f8f0e5] text-[#23191b]">
      {showLoadingScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#23191b] text-[#edc3c8]" role="status" aria-label="Loading Dorévielle">
          <div className="text-center animate-rise">
            <div className="font-editorial text-[clamp(5rem,18vw,11rem)] leading-[.75] tracking-[-.1em]">D<span className="text-[.35em] align-top">˚</span></div>
            <p className="mt-7 font-mono-brand text-[9px] uppercase tracking-[.24em] text-[#f8f0e5]">Making room for good ideas<span className="animate-blink">...</span></p>
          </div>
        </div>
      )}
      <div className="bg-[#23191b] px-4 py-2 text-center font-mono-brand text-[9px] uppercase tracking-[.22em] text-[#f8f0e5]" data-testid="banner-announcement">Free shipping on orders over $100 / Make a little room for good ideas</div>
      <header className="relative z-20 border-b border-[#23191b]/15 bg-[#f8f0e5]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 md:px-8">
          <button type="button" className="flex items-center gap-2 md:hidden" onClick={() => setMobileNav((value) => !value)} aria-label="Toggle menu" data-testid="button-toggle-menu"><Menu className="h-5 w-5" /></button>
          <a href="#top" className="font-editorial text-3xl italic tracking-[-.06em] md:text-[38px]" data-testid="link-home">Dorévielle<span className="text-[#d58e99]">.</span></a>
          <nav className={`${mobileNav ? 'absolute left-0 right-0 top-full flex border-b border-[#23191b]/15 bg-[#f8f0e5] p-5' : 'hidden'} flex-col gap-4 font-mono-brand text-[10px] uppercase tracking-[.16em] md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`} data-testid="nav-main">
            <a href="#collection" onClick={() => setMobileNav(false)} data-testid="link-shop">Shop the edit</a>
            <a href="#story" onClick={() => setMobileNav(false)} data-testid="link-story">Our point of view</a>
            <a href="#journal" onClick={() => setMobileNav(false)} data-testid="link-journal">Journal</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#newsletter" className="hidden font-mono-brand text-[10px] uppercase tracking-[.16em] md:block" data-testid="link-newsletter">Join the list</a>
            <button type="button" onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 border-l border-[#23191b]/15 pl-3 font-mono-brand text-[10px] uppercase tracking-[.16em]" data-testid="button-open-cart"><ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">Bag</span>{cartCount > 0 && <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d58e99] px-1 text-[9px]" data-testid="badge-cart-count">{cartCount}</span>}</button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative mx-auto grid max-w-[1440px] overflow-hidden border-b border-[#23191b]/15 lg:grid-cols-[1.12fr_.88fr]" aria-labelledby="hero-title">
          <div className="relative flex min-h-[620px] flex-col justify-between overflow-hidden bg-[#d58e99] px-6 pb-8 pt-12 md:min-h-[680px] md:px-12 md:pt-16">
            <div className="relative z-10 flex items-start justify-between"><p className="font-mono-brand text-[10px] uppercase tracking-[.2em]">Vol. 01 / Things for people who make things</p><span className="font-mono-brand text-[10px] uppercase tracking-[.2em]">Paris — Everywhere</span></div>
            <div className="relative z-10 mt-20 animate-rise">
              <p className="mb-5 max-w-[300px] font-mono-brand text-[10px] uppercase leading-relaxed tracking-[.18em]">A lifestyle storefront for the ambitious, the curious, and the beautifully overcommitted.</p>
              <h1 id="hero-title" className="max-w-[820px] font-editorial text-[clamp(4.8rem,11vw,10rem)] leading-[.79] tracking-[-.07em]">Make<br /><span className="ml-[8vw] italic text-[#f8f0e5]">your</span><br />mark<span className="text-[#f8f0e5]">.</span></h1>
            </div>
            <div className="relative z-10 flex items-end justify-between pt-14"><p className="max-w-[230px] font-editorial text-xl leading-tight md:text-2xl">Tools for a life in progress.</p><a href="#collection" className="flex h-16 w-16 items-center justify-center rounded-full border border-[#23191b]/60 transition hover:rotate-45" aria-label="Explore collection" data-testid="link-explore-collection"><ArrowDownRight className="h-6 w-6" strokeWidth={1.4} /></a></div>
            <div className="absolute -bottom-12 -right-12 h-72 w-72 rounded-full border-[1px] border-[#23191b]/25 md:h-[430px] md:w-[430px]" />
            <div className="absolute -bottom-20 left-[34%] h-44 w-44 rotate-12 border border-[#f8f0e5]/50" />
          </div>
          <div className="relative min-h-[440px] overflow-hidden bg-[#e6dedb] lg:min-h-[680px]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_44%,rgba(35,25,27,.09)_44%,rgba(35,25,27,.09)_45%,transparent_45%)]" />
            <div className="absolute left-[13%] top-[14%] h-[58%] w-[62%] rotate-[-7deg] bg-[#f8f0e5] shadow-[20px_22px_0_#23191b]">
              <div className="absolute inset-5 border border-[#23191b]/30" />
              <div className="absolute left-8 top-9 font-mono-brand text-[9px] uppercase tracking-[.22em]">Field notes / 001</div>
              <div className="absolute bottom-10 left-7 right-7 font-editorial text-[clamp(2.8rem,5vw,5rem)] leading-[.8] tracking-[-.05em]">The<br /><span className="ml-8 italic text-[#d58e99]">good</span><br />work.</div>
              <div className="absolute bottom-5 right-7 font-mono-brand text-[9px] uppercase tracking-[.16em]">Dorévielle</div>
            </div>
            <div className="animate-float absolute bottom-[12%] right-[8%] h-28 w-24 rotate-12 border border-[#23191b] bg-[#d58e99] p-3 shadow-[8px_8px_0_#23191b] md:h-40 md:w-32"><div className="h-full border border-[#23191b]/50 p-2 font-mono-brand text-[8px] uppercase leading-relaxed">Build<br />slowly<br />ship<br />boldly</div></div>
            <div className="absolute bottom-6 left-7 font-mono-brand text-[9px] uppercase tracking-[.18em] text-[#6f5a5a]">Image: the desk where it starts</div>
          </div>
        </section>

        <div className="overflow-hidden border-b border-[#23191b]/15 bg-[#23191b] py-3 text-[#f8f0e5]" data-testid="ticker-band">
          <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap font-mono-brand text-[10px] uppercase tracking-[.25em]"><span>Good ideas need somewhere to land</span><span className="text-[#edc3c8]">/</span><span>Small rituals / big swings</span><span className="text-[#edc3c8]">/</span><span>Dorévielle studio supply</span><span className="text-[#edc3c8]">/</span><span>Good ideas need somewhere to land</span><span className="text-[#edc3c8]">/</span><span>Small rituals / big swings</span><span className="text-[#edc3c8]">/</span></div>
        </div>

        <section id="story" className="mx-auto grid max-w-[1440px] border-b border-[#23191b]/15 lg:grid-cols-[.72fr_1.28fr]">
          <div className="border-b border-[#23191b]/15 p-6 md:p-10 lg:border-b-0 lg:border-r"><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-[#6f5a5a]">Our point of view / 01</p><div className="mt-24 hidden h-36 w-36 rounded-full border border-[#23191b]/30 lg:block"><div className="m-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#edc3c8] font-editorial text-5xl italic">D</div></div><p className="mt-16 max-w-[260px] font-mono-brand text-[10px] uppercase leading-[1.7] tracking-[.12em] text-[#6f5a5a]">No productivity theatre. No beige sameness. Just beautiful, useful things for the life you are actually making.</p></div>
          <div className="p-6 py-16 md:p-12 md:py-20"><h2 className="max-w-[850px] font-editorial text-[clamp(2.9rem,6vw,6rem)] leading-[.91] tracking-[-.06em]">You do not need <span className="italic text-[#d58e99]">more</span> things.<br />You need the right ones.</h2><div className="mt-14 grid gap-8 border-t border-[#23191b]/20 pt-7 sm:grid-cols-2"><p className="text-sm leading-relaxed text-[#6f5a5a]">Dorévielle is a considered collection of desk objects, field guides, and wearable reminders for women turning a first draft into a real thing.</p><p className="text-sm leading-relaxed text-[#6f5a5a]">Every piece has a job: to make the next hour feel possible, the big idea feel tangible, and your point of view feel unmistakably yours.</p></div></div>
        </section>

        <section id="collection" className="mx-auto max-w-[1440px] border-b border-[#23191b]/15 px-5 py-16 md:px-8 md:py-24">
          <div className="mb-10 flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-[#6f5a5a]">The edit / 02</p><h2 className="mt-3 font-editorial text-[clamp(3rem,6vw,6.2rem)] leading-[.86] tracking-[-.06em]">For the<br /><span className="italic text-[#d58e99]">in-between</span> hours.</h2></div><div className="flex w-full max-w-[380px] items-center border-b border-[#23191b]/35 pb-2"><Search className="mr-2 h-4 w-4" strokeWidth={1.5} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the edit" className="w-full bg-transparent text-sm outline-none placeholder:text-[#6f5a5a]" data-testid="input-search-products" /></div></div>
          <div className="mb-10 flex flex-wrap items-center gap-2 border-y border-[#23191b]/15 py-3">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`px-3 py-2 font-mono-brand text-[10px] uppercase tracking-[.15em] transition ${filter === item ? 'bg-[#23191b] text-[#f8f0e5]' : 'text-[#6f5a5a] hover:bg-[#edc3c8]'}`} data-testid={`button-filter-${item.toLowerCase()}`}>{item}</button>)}<span className="ml-auto font-mono-brand text-[10px] uppercase tracking-[.15em] text-[#6f5a5a]" data-testid="text-product-count">{visibleProducts.length} pieces</span></div>
          {productsQuery.isLoading && <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="animate-pulse"><div className="aspect-[.92] bg-[#edc3c8]/60" /><div className="mt-4 h-5 w-2/3 bg-[#edc3c8]/60" /><div className="mt-2 h-3 w-full bg-[#edc3c8]/40" /></div>)}</div>}
          {productsQuery.isError && <div className="border border-[#23191b]/20 bg-[#edc3c8]/30 p-8 text-center"><p className="font-editorial text-2xl">The shelves are taking a moment.</p><p className="mt-2 text-sm text-[#6f5a5a]">We could not load the collection just now.</p><button type="button" onClick={() => productsQuery.refetch()} className="mt-5 border border-[#23191b] px-4 py-2 font-mono-brand text-[10px] uppercase tracking-[.16em]" data-testid="button-retry-products">Try again</button></div>}
          {!productsQuery.isLoading && !productsQuery.isError && visibleProducts.length === 0 && <div className="border border-dashed border-[#23191b]/30 p-16 text-center"><Sparkles className="mx-auto mb-4 h-6 w-6" /><p className="font-editorial text-3xl">Nothing by that name.</p><p className="mt-2 text-sm text-[#6f5a5a]">Try another search or return to the full edit.</p><button type="button" onClick={() => { setSearch(''); setFilter('Everything'); }} className="mt-5 underline underline-offset-4 font-mono-brand text-[10px] uppercase tracking-[.15em]" data-testid="button-reset-products">Reset the edit</button></div>}
          {!productsQuery.isLoading && !productsQuery.isError && visibleProducts.length > 0 && <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToBag} pending={busyProduct === product.id} />)}</div>}
        </section>

        <section id="journal" className="mx-auto grid max-w-[1440px] border-b border-[#23191b]/15 lg:grid-cols-[1.35fr_.65fr]">
          <div className="bg-[#23191b] p-6 text-[#f8f0e5] md:p-12"><div className="flex items-start justify-between"><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-[#edc3c8]">From the journal / 03</p><ArrowDownRight className="h-5 w-5 text-[#edc3c8]" /></div><div className="mt-28 grid gap-10 md:grid-cols-[.9fr_1.1fr] md:items-end"><p className="font-editorial text-[clamp(3rem,7vw,7rem)] leading-[.82] tracking-[-.06em]">The<br /><span className="italic text-[#edc3c8]">soft</span><br />launch.</p><div><p className="font-mono-brand text-[10px] uppercase tracking-[.17em] text-[#edc3c8]">A note on beginning before you feel ready</p><p className="mt-6 max-w-[360px] text-sm leading-relaxed text-[#f8f0e5]/65">There is a version of courage that looks like an open tab, a half-filled notebook, and a calendar block called “figure it out.” We made a few things for her.</p><button type="button" onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })} className="mt-8 flex items-center gap-3 font-mono-brand text-[10px] uppercase tracking-[.18em] transition hover:text-[#edc3c8]" data-testid="button-read-journal">Read the field note <ArrowRight className="h-4 w-4" /></button></div></div></div>
          <div className="relative min-h-[430px] overflow-hidden bg-[#edc3c8] p-7"><div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-[#23191b]/40" /><div className="absolute left-[13%] top-[18%] h-[60%] w-[66%] rotate-6 bg-[#f8f0e5] p-5 shadow-[12px_14px_0_#23191b]"><div className="h-full border border-[#23191b]/25 p-4"><p className="font-mono-brand text-[9px] uppercase tracking-[.18em]">A very short list</p><ol className="mt-9 space-y-4 font-editorial text-2xl italic"><li>01. Start messy.</li><li>02. Stay interested.</li><li>03. Make it yours.</li></ol></div></div><p className="absolute bottom-7 left-7 font-mono-brand text-[9px] uppercase tracking-[.16em]">Notes from the studio</p></div>
        </section>

        <section id="newsletter" className="mx-auto max-w-[1440px] bg-[#e7d6bf] px-6 py-20 md:px-12 md:py-28"><div className="grid gap-12 md:grid-cols-[1fr_.8fr] md:items-end"><div><p className="font-mono-brand text-[10px] uppercase tracking-[.2em] text-[#6f5a5a]">The dispatch / 04</p><h2 className="mt-4 max-w-[750px] font-editorial text-[clamp(3.2rem,7vw,7rem)] leading-[.84] tracking-[-.06em]">Come for the objects.<br /><span className="italic text-[#c87987]">Stay for the thinking.</span></h2></div><div><p className="max-w-[370px] text-sm leading-relaxed text-[#6f5a5a]">A note from the desk every few weeks: useful prompts, good references, and new things worth making room for.</p>{subscribed ? <div className="mt-7 flex items-center gap-2 border-b border-[#23191b]/40 pb-3 font-mono-brand text-[10px] uppercase tracking-[.16em]" data-testid="status-newsletter-success"><Check className="h-4 w-4" /> You are on the list.</div> : <form onSubmit={(event) => { event.preventDefault(); if (email.trim()) setSubscribed(true); }} className="mt-7 flex items-center gap-2 border-b border-[#23191b]/40 pb-3"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6f5a5a]" data-testid="input-newsletter-email" /><button type="submit" className="flex items-center gap-2 font-mono-brand text-[10px] uppercase tracking-[.16em]" data-testid="button-submit-newsletter">Join <ArrowRight className="h-4 w-4" /></button></form>}</div></div></section>
      </main>

      <footer className="bg-[#23191b] px-5 py-10 text-[#f8f0e5] md:px-8 md:py-14"><div className="mx-auto max-w-[1440px]"><div className="grid gap-10 border-b border-[#f8f0e5]/20 pb-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]"><div><a href="#top" className="font-editorial text-4xl italic tracking-[-.06em]" data-testid="link-footer-home">Dorévielle<span className="text-[#edc3c8]">.</span></a><p className="mt-5 max-w-[250px] text-sm leading-relaxed text-[#f8f0e5]/60">For women who build, lead, question, and begin again.</p></div><div><p className="mb-4 font-mono-brand text-[9px] uppercase tracking-[.2em] text-[#edc3c8]">Explore</p><div className="space-y-2 text-sm text-[#f8f0e5]/70"><a href="#collection" className="block hover:text-[#edc3c8]" data-testid="link-footer-shop">Shop the edit</a><a href="#story" className="block hover:text-[#edc3c8]" data-testid="link-footer-story">Our point of view</a><a href="#journal" className="block hover:text-[#edc3c8]" data-testid="link-footer-journal">The journal</a></div></div><div><p className="mb-4 font-mono-brand text-[9px] uppercase tracking-[.2em] text-[#edc3c8]">Care</p><div className="space-y-2 text-sm text-[#f8f0e5]/70"><a href="#newsletter" className="block hover:text-[#edc3c8]" data-testid="link-footer-contact">Contact</a><a href="#top" className="block hover:text-[#edc3c8]" data-testid="link-footer-shipping">Shipping & returns</a><a href="#top" className="block hover:text-[#edc3c8]" data-testid="link-footer-faq">FAQ</a></div></div><div><p className="mb-4 font-mono-brand text-[9px] uppercase tracking-[.2em] text-[#edc3c8]">Elsewhere</p><a href="https://www.instagram.com/dorevielle" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#f8f0e5]/70 hover:text-[#edc3c8]" data-testid="link-instagram"><Instagram className="h-4 w-4" /> Instagram</a></div></div><div className="flex flex-col justify-between gap-3 pt-5 font-mono-brand text-[9px] uppercase tracking-[.15em] text-[#f8f0e5]/45 sm:flex-row"><span>© 2025 Dorévielle studio</span><span>Made for the work in progress</span></div></div></footer>
      {notice && <div className="fixed bottom-5 left-5 z-30 max-w-[280px] border border-[#23191b]/20 bg-[#f8f0e5] px-4 py-3 text-xs shadow-lg" data-testid="status-cart-notice">{notice}<button type="button" className="ml-3 opacity-50 hover:opacity-100" onClick={() => setNotice('')} aria-label="Dismiss notice"><X className="inline h-3 w-3" /></button></div>}
      <CartDrawer open={cartOpen} cart={cart} cartLoading={cartQuery.isLoading} cartError={cartQuery.isError} onRetry={() => cartQuery.refetch()} busyLine={busyLine} onClose={() => setCartOpen(false)} onUpdate={updateQuantity} onRemove={removeLine} onCheckout={() => { if (cart?.checkoutUrl) window.location.href = cart.checkoutUrl; }} />
      <ChatWidget />
    </div>
  );
}