import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Heart, HeartOff, MapPin, Minus, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart, lineKey, type CartItem } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { isPhysical } from "../utils/productTypes";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { inWishlist, removeFromWishlist, toggleWishlist, useWishlist } from "./local";
import { useSellers } from "./sellers";
import { EmptyState, m2, Monogram, naira, ProductCard, productUrl, storeUrl, useCatalog } from "./ui";

type Quote = { subtotal: number; discount: number; serviceFee: number; total: number };

// The price check checkout runs, so the payment fee shows before checkout.
function useQuote(items: CartItem[]) {
  const { user, authHeader } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [failed, setFailed] = useState(false);
  const key = items.map((i) => `${lineKey(i)}x${i.quantity}`).join(",");
  useEffect(() => {
    if (!items.length) return;
    let live = true;
    const t = setTimeout(() => {
      api.post(`${API_BASE}/checkout-quote`, {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, ...(i.tierId ? { tierId: i.tierId } : {}) })),
        paymentMethod: "card", paymentProvider: "paystack",
      }, { headers: authHeader })
        .then((q: Quote) => { if (live) { setQuote(q); setFailed(false); } })
        .catch(() => { if (live) { setQuote(null); setFailed(true); } });
    }, 250);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id]);
  return { quote, failed };
}

export function CartPage() {
  const { items, updateQuantity, removeItem, addItem, subtotal } = useCart();
  const { products } = useCatalog();
  const { quote, failed } = useQuote(items);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const groups = useMemo(() => {
    const out = new Map<string, { slug: string | null; name: string; lines: CartItem[] }>();
    items.forEach((item) => {
      const p = byId.get(item.productId);
      const k = p?.merchantSlug ?? "_";
      const g = out.get(k) ?? { slug: p?.merchantSlug ?? null, name: p?.merchantName ?? "", lines: [] };
      g.lines.push(item);
      out.set(k, g);
    });
    return [...out.values()];
  }, [items, byId]);
  const sellers = useSellers(groups.map((g) => g.slug));

  const remove = (item: CartItem) => {
    removeItem(lineKey(item));
    toast(`Removed ${item.name}`, {
      action: { label: "Undo", onClick: () => addItem({ id: item.productId, name: item.name, image: item.image, price: item.price, codEligible: item.codEligible, productType: item.productType, tierId: item.tierId, tierName: item.tierName }, item.quantity) },
    });
  };
  const saveForLater = (item: CartItem) => {
    if (!inWishlist(item.productId)) toggleWishlist(item.productId);
    removeItem(lineKey(item));
    toast(`Moved ${item.name} to your wishlist`);
  };

  if (!items.length) {
    return (
      <div className="m2-wrap py-8">
        <EmptyState icon={<ShoppingCart className="h-10 w-10" />} title="Your cart is empty" action={<Link to={m2()} className="m2-btn">Start shopping</Link>}>
          Add things from any shop; you'll pay for them together.
        </EmptyState>
      </div>
    );
  }

  const codCount = items.filter((i) => i.codEligible).length;

  return (
    <div className="m2-wrap py-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="grid gap-4 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Your cart</h1>
          <p className="text-sm m2-ink2">{items.length} item{items.length === 1 ? "" : "s"} from {groups.length} shop{groups.length === 1 ? "" : "s"} · one checkout pays for everything</p>
        </div>
        {groups.map((g, gi) => {
          const seller = g.slug ? sellers.get(g.slug) : null;
          const where = [seller?.area, seller?.state].filter(Boolean).join(", ");
          const groupTotal = g.lines.reduce((s, l) => s + l.price * l.quantity, 0);
          return (
            <section key={gi} className="m2-panel" aria-label={g.name ? `From ${g.name}` : "Items"}>
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3" style={{ borderBottom: "1px solid var(--m-line)" }}>
                {g.name && <Monogram name={g.name} size={28} />}
                <span className="font-bold">{g.slug ? <Link to={storeUrl(g.slug)} className="hover:underline">{g.name}</Link> : g.name || "Items"}</span>
                {where && g.lines.some((l) => isPhysical(l.productType)) && <span className="text-xs m2-ink3 flex items-center gap-1"><MapPin className="h-3 w-3" /> Ships from {where}</span>}
                <span className="ml-auto text-sm m2-ink2">Subtotal <b className="m2-price">{naira(groupTotal)}</b></span>
              </header>
              <ul>
                {g.lines.map((item, i) => {
                  const k = lineKey(item);
                  const multi = isPhysical(item.productType) || item.productType === "ticket";
                  const p = byId.get(item.productId);
                  const cap = p?.stockQuantity != null && isPhysical(item.productType) ? p.stockQuantity : 99;
                  return (
                    <li key={k} className="p-4 grid grid-cols-[80px_minmax(0,1fr)] sm:grid-cols-[96px_minmax(0,1fr)_auto] gap-x-4 gap-y-3" style={{ borderTop: i ? "1px solid var(--m-line)" : undefined }}>
                      <Link to={productUrl(item.productId)} className="row-span-2 sm:row-span-1"><ImageWithFallback src={item.image} alt="" className="w-full aspect-square rounded-md object-cover" /></Link>
                      <div className="grid gap-1 content-start min-w-0">
                        <Link to={productUrl(item.productId)} className="font-semibold leading-snug line-clamp-2 hover:underline">{item.name}</Link>
                        {item.tierName && <p className="text-sm m2-ink2">Ticket: {item.tierName}</p>}
                        <p className="text-sm m2-ink3 m2-num">{naira(item.price)} each</p>
                        <p className="text-xs font-semibold" style={{ color: item.codEligible ? "var(--m-good)" : "var(--m-ink-3)" }}>{item.codEligible ? "Pay on delivery available" : isPhysical(item.productType) ? "Online payment only" : "Delivered to your Library"}</p>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 col-start-2 sm:col-start-3">
                        <span className="m2-price text-lg">{naira(item.price * item.quantity)}</span>
                        {multi ? (
                          <div className="flex items-center rounded-md" style={{ border: "1px solid var(--m-line-strong)" }}>
                            <button type="button" onClick={() => item.quantity <= 1 ? remove(item) : updateQuantity(k, item.quantity - 1)} aria-label={item.quantity <= 1 ? `Remove ${item.name}` : `One fewer ${item.name}`} className="h-9 w-9 inline-flex items-center justify-center">
                              {item.quantity <= 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            </button>
                            <span className="w-8 text-center font-bold m2-num" aria-live="polite">{item.quantity}</span>
                            <button type="button" disabled={item.quantity >= cap} onClick={() => updateQuantity(k, item.quantity + 1)} aria-label={`One more ${item.name}`} className="h-9 w-9 inline-flex items-center justify-center disabled:opacity-35"><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : <span className="text-xs m2-ink3">One per order</span>}
                      </div>
                      <div className="col-start-2 sm:col-span-2 flex gap-4 text-sm">
                        <button type="button" className="m2-link inline-flex items-center gap-1" onClick={() => saveForLater(item)}><Heart className="h-3.5 w-3.5" /> Save for later</button>
                        <button type="button" className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--m-bad)" }} onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className="grid gap-3 lg:sticky lg:top-[136px]" aria-label="Order summary">
        <div className="m2-panel p-4 grid gap-3">
          <h2 className="font-extrabold text-lg">Order summary</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="m2-ink2">Items ({items.reduce((n, i) => n + i.quantity, 0)})</dt><dd className="m2-num">{naira(quote?.subtotal ?? subtotal)}</dd></div>
            {!!quote?.discount && <div className="flex justify-between" style={{ color: "var(--m-good)" }}><dt>Discount</dt><dd className="m2-num">−{naira(quote.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="m2-ink2">Payment fee</dt><dd className="m2-num">{quote ? naira(quote.serviceFee) : failed ? "At checkout" : "…"}</dd></div>
            <div className="flex justify-between pt-2 text-base font-extrabold" style={{ borderTop: "1px solid var(--m-line)" }}><dt>Total</dt><dd className="m2-price">{naira(quote?.total ?? subtotal)}</dd></div>
          </dl>
          <p className="text-xs m2-ink3">{quote ? "Paying online. " : ""}{codCount > 0 ? "Paying on delivery has a smaller fee; checkout shows it. " : ""}Coupons are added at checkout.</p>
          <Link to={m2("/checkout")} className="m2-btn w-full">Go to checkout</Link>
          <Link to={m2()} className="m2-link text-sm text-center">Continue shopping</Link>
        </div>
        <p className="flex gap-2 text-xs m2-ink2 px-1"><ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "var(--m-accent)" }} /> One payment covers every shop. Your checkout becomes one order per shop, each tracked on its own.</p>
      </aside>

      <SavedForLater />
    </div>
  );
}

function SavedForLater() {
  const ids = useWishlist();
  const { products } = useCatalog();
  const saved = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 6) as any[];
  if (!saved.length) return null;
  return (
    <section className="lg:col-span-2 pt-4 grid gap-3">
      <div className="flex items-end justify-between"><h2 className="text-xl font-extrabold">Saved for later</h2><Link to={m2("/wishlist")} className="m2-link text-sm">Your wishlist →</Link></div>
      <div className="m2-rail m2-scroll">{saved.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </section>
  );
}

export function WishlistPage() {
  const ids = useWishlist();
  const { products, loading } = useCatalog();
  const saved = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as any[];
  return (
    <div className="m2-wrap py-5 grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Wishlist</h1>
        <p className="text-sm m2-ink3">Saved on this device.</p>
      </div>
      {!loading && saved.length === 0 ? (
        <EmptyState icon={<HeartOff className="h-10 w-10" />} title="Nothing saved yet" action={<Link to={m2()} className="m2-btn">Find something you like</Link>}>
          Tap the heart on any product to keep it here.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{saved.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          {saved.length > 0 && <button type="button" className="m2-link text-sm justify-self-start" onClick={() => saved.forEach((p) => removeFromWishlist(p.id))}>Clear wishlist</button>}
        </>
      )}
    </div>
  );
}
