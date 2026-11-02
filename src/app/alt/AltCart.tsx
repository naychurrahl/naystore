import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Minus, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart, lineKey, type CartItem } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { isPhysical } from "../utils/productTypes";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { altPath, naira, productPath, sellerPath, useCatalog } from "./shared";

type Quote = { subtotal: number; discount: number; itemsTotal: number; serviceFee: number; total: number };

// What the API says paying online would cost, the same check checkout runs,
// so the payment fee is visible before checkout.
function useCartQuote(items: CartItem[]) {
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
    }, 300);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id]);

  return { quote, failed };
}

export function AltCart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const { products } = useCatalog();
  const { quote, failed } = useCartQuote(items);

  // One group per shop, as each shop sends its own part of the order.
  const groups = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const out = new Map<string, { name: string; slug: string | null; lines: CartItem[] }>();
    for (const item of items) {
      const p = byId.get(item.productId);
      const key = p?.merchantSlug ?? "_store";
      const g = out.get(key) ?? { name: p?.merchantName ?? "", slug: p?.merchantSlug ?? null, lines: [] };
      g.lines.push(item);
      out.set(key, g);
    }
    return [...out.values()];
  }, [items, products]);

  const codCount = items.filter((i) => i.codEligible).length;

  if (items.length === 0) {
    return (
      <div className="alt-wrap py-16 grid justify-items-center gap-3 text-center">
        <ShoppingCart className="h-12 w-12 alt-muted" aria-hidden />
        <h1 className="text-2xl font-extrabold">Your cart is empty</h1>
        <p className="alt-soft">Find something you like and it will wait for you here.</p>
        <Link to={altPath("/search")} className="alt-btn">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="alt-wrap py-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="grid gap-4 min-w-0">
        <h1 className="text-2xl font-extrabold">Cart <span className="alt-muted font-semibold text-lg">({items.length} item{items.length === 1 ? "" : "s"})</span></h1>
        {groups.map((g, gi) => (
          <section key={gi} className="alt-card">
            {g.name && (
              <p className="px-4 py-2.5 text-sm font-bold flex items-center gap-2" style={{ borderBottom: "1px solid var(--a-line)" }}>
                <Store className="h-4 w-4 alt-muted" aria-hidden />
                {g.slug ? <Link to={sellerPath(g.slug)} className="hover:underline">{g.name}</Link> : g.name}
              </p>
            )}
            <ul>
              {g.lines.map((item, i) => {
                const key = lineKey(item);
                const multi = isPhysical(item.productType) || item.productType === "ticket";
                return (
                  <li key={key} className="p-4 flex gap-3" style={{ borderTop: i ? "1px solid var(--a-line)" : undefined }}>
                    <Link to={productPath(item.productId)} className="shrink-0">
                      <ImageWithFallback src={item.image} alt="" className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-cover" style={{ background: "var(--a-sunk)" }} />
                    </Link>
                    <div className="flex-1 min-w-0 grid gap-1 content-start">
                      <Link to={productPath(item.productId)} className="font-semibold leading-snug line-clamp-2 hover:underline">{item.name}</Link>
                      {item.tierName && <p className="text-sm alt-soft">{item.tierName} ticket</p>}
                      <p className="text-sm alt-muted tabular-nums">{naira(item.price)} each</p>
                      <p className="text-xs font-semibold" style={{ color: item.codEligible ? "var(--a-good)" : "var(--a-ink-3)" }}>
                        {item.codEligible ? "Pay on delivery available" : "Pay online only"}
                      </p>
                      <div className="flex items-center justify-between gap-3 mt-1 flex-wrap">
                        {multi ? (
                          <div className="flex items-center rounded-[10px]" style={{ border: "1px solid var(--a-line)" }}>
                            <button type="button" onClick={() => updateQuantity(key, item.quantity - 1)} aria-label={`One fewer ${item.name}`}
                              className="h-9 w-9 inline-flex items-center justify-center"><Minus className="h-4 w-4" /></button>
                            <span className="w-8 text-center font-bold tabular-nums">{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(key, item.quantity + 1)} aria-label={`One more ${item.name}`}
                              className="h-9 w-9 inline-flex items-center justify-center"><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : <span className="text-xs alt-muted">One per order</span>}
                        <div className="flex items-center gap-2">
                          <span className="alt-price">{naira(item.price * item.quantity)}</span>
                          <button type="button" onClick={() => removeItem(key)} aria-label={`Remove ${item.name}`}
                            className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-[var(--a-sunk)]" style={{ color: "var(--a-bad)" }}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <aside className="alt-card p-4 grid gap-3 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="font-extrabold text-lg">Summary</h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="alt-soft">Items</dt><dd className="tabular-nums">{naira(quote?.subtotal ?? subtotal)}</dd></div>
          {!!quote?.discount && (
            <div className="flex justify-between gap-3"><dt className="alt-soft">Discount</dt><dd className="tabular-nums alt-save">−{naira(quote.discount)}</dd></div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="alt-soft">Payment fee</dt>
            <dd className="tabular-nums">{quote ? naira(quote.serviceFee) : failed ? "At checkout" : "…"}</dd>
          </div>
          <div className="flex justify-between gap-3 pt-2 text-base font-extrabold" style={{ borderTop: "1px solid var(--a-line)" }}>
            <dt>Total</dt><dd className="alt-price">{quote ? naira(quote.total) : naira(subtotal)}</dd>
          </div>
        </dl>
        <p className="text-xs alt-muted">
          {quote ? "If you pay online. " : ""}Coupons, delivery address and payment choice come next.
          {codCount > 0 && ` Paying on delivery changes the fee; checkout shows it.`}
        </p>
        <Link to="/checkout" className="alt-btn w-full">Checkout</Link>
        {codCount > 0 && codCount < items.length && (
          <p className="text-xs alt-soft">Pay on delivery is available for {codCount} of {items.length} items; the rest are paid online.</p>
        )}
        <Link to={altPath("/search")} className="alt-link text-sm text-center">Keep shopping</Link>
      </aside>
    </div>
  );
}
