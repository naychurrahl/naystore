import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useCart } from "../context/CartContext";
import { isPhysical, productTypeLabel } from "../utils/productTypes";
import { formatEventTime } from "../utils/eventTime";
import { naira, saving, type AltProduct } from "../alt/shared";
import { toggleWishlist, useWishlist } from "./local";

export { naira, saving, useCatalog, type AltProduct } from "../alt/shared";

export const m2 = (path = "") => `/alt_2${path}`;
export const productUrl = (id: string) => m2(`/p/${id}`);
export const storeUrl = (slug: string) => m2(`/s/${slug}`);
export const categoryUrl = (name: string) => m2(`/c/${encodeURIComponent(name)}`);
export const searchUrl = (q = "") => m2(`/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} width={size} height={size} aria-hidden fill={n <= Math.round(rating) ? "var(--m-star)" : "none"} style={{ color: "var(--m-star)" }} />
      ))}
    </span>
  );
}

// The shop's initial on a tinted square: shops have no logo upload yet.
export function Monogram({ name, size = 44 }: { name: string; size?: number }) {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span aria-hidden className="inline-flex items-center justify-center shrink-0 font-extrabold rounded-md"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue} 45% 88%)`, color: `hsl(${hue} 55% 24%)` }}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function SectionHead({ title, note, action }: { title: string; note?: string; action?: { to: string; label: string } }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-[22px] font-extrabold leading-tight">{title}</h2>
        {note && <p className="text-sm m2-ink3 mt-0.5">{note}</p>}
      </div>
      {action && <Link to={action.to} className="m2-link text-sm shrink-0">{action.label} →</Link>}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="m2-panel overflow-hidden" aria-hidden>
      <div className="m2-skel aspect-square" style={{ borderRadius: 0 }} />
      <div className="p-3 grid gap-2"><div className="m2-skel h-4 w-11/12" /><div className="m2-skel h-4 w-1/2" /><div className="m2-skel h-9 w-full" /></div>
    </div>
  );
}

export function WishButton({ product, className = "", size = 18 }: { product: { id: string; name: string }; className?: string; size?: number }) {
  const list = useWishlist();
  const on = list.includes(product.id);
  return (
    <button type="button" aria-pressed={on} aria-label={on ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        const added = toggleWishlist(product.id);
        toast(added ? "Saved to your wishlist" : "Removed from your wishlist");
      }}
      className={`inline-flex items-center justify-center rounded-full ${className}`}>
      <Heart key={String(on)} width={size} height={size} className={on ? "m2-heart-on" : ""}
        fill={on ? "var(--m-bad)" : "none"} style={{ color: on ? "var(--m-bad)" : "currentColor" }} />
    </button>
  );
}

export function useAddToCart() {
  const { addItem } = useCart();
  const navigate = useNavigate();
  return (product: AltProduct, quantity = 1) => {
    addItem(product, quantity);
    toast.success(quantity > 1 ? `Added ${quantity} × ${product.name}` : `Added ${product.name}`, {
      description: "It's in your cart.",
      action: { label: "View cart", onClick: () => navigate(m2("/cart")) },
    });
  };
}

export function availability(p: AltProduct): { text: string; tone: "good" | "warn" | "bad" | "plain" } {
  if (!isPhysical(p.productType)) return { text: p.productType === "ticket" ? "Tickets on sale" : "Instant access", tone: "plain" };
  if (!p.inStock) return { text: "Sold out", tone: "bad" };
  if (p.stockQuantity != null && p.stockQuantity <= 5) return { text: `Only ${p.stockQuantity} left`, tone: "warn" };
  return { text: "In stock", tone: "good" };
}
export const toneColor = { good: "var(--m-good)", warn: "var(--m-bad)", bad: "var(--m-bad)", plain: "var(--m-ink-3)" };

// One card everywhere: square photo, wishlist, discount, name, rating,
// price, availability, shop, and the action.
export function ProductCard({ product, showStore = true }: { product: AltProduct; showStore?: boolean }) {
  const add = useAddToCart();
  const off = saving(product);
  const ticket = product.productType === "ticket";
  const soldOut = isPhysical(product.productType) && !product.inStock;
  const emptyCourse = product.productType === "course" && !product.lessonCount;
  const stock = availability(product);

  return (
    <article className="m2-panel m2-lift overflow-hidden flex flex-col h-full group relative">
      <div className="relative">
        <Link to={productUrl(product.id)} className="block aspect-square overflow-hidden" style={{ background: "var(--m-sunk)" }} tabIndex={-1} aria-hidden>
          <ImageWithFallback src={product.image} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        </Link>
        {off && <span className="m2-badge m2-badge-deal absolute top-2 left-2">−{off.percent}%</span>}
        <WishButton product={product} className="absolute top-1.5 right-1.5 h-9 w-9 shadow-sm bg-[var(--m-surface)] m2-ink2" size={17} />
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1 min-w-0">
        {!isPhysical(product.productType) && <span className="m2-badge m2-badge-accent self-start">{productTypeLabel(product.productType)}</span>}
        <Link to={productUrl(product.id)} className="text-[15px] font-semibold leading-snug line-clamp-2 hover:underline">{product.name}</Link>
        {!!product.reviewCount && product.avgRating != null && (
          <span className="flex items-center gap-1 text-xs m2-ink3"><Stars rating={product.avgRating} size={12} /> <span className="m2-num">{product.avgRating} ({product.reviewCount})</span></span>
        )}
        {product.eventStartsAt && <span className="text-xs m2-ink2">{formatEventTime(product.eventStartsAt)} WAT</span>}
        <div className="flex items-baseline flex-wrap gap-x-2 mt-auto pt-1">
          <span className="m2-price text-[19px]">{ticket && <span className="text-xs font-semibold m2-ink3">from </span>}{naira(product.price)}</span>
          {off && <span className="m2-was text-[13px]">{naira(off.was)}</span>}
        </div>
        <span className="text-xs font-semibold" style={{ color: toneColor[stock.tone] }}>
          {stock.text}{isPhysical(product.productType) && product.inStock && product.codEligible ? <span className="m2-ink3 font-medium"> · Pay on delivery</span> : null}
        </span>
        {showStore && product.merchantSlug && (
          <Link to={storeUrl(product.merchantSlug)} className="text-xs m2-ink3 hover:underline truncate">{product.merchantName}</Link>
        )}
        {ticket ? (
          <Link to={productUrl(product.id)} className="m2-btn-line m2-btn-sm mt-1.5">Choose tickets</Link>
        ) : (
          <button type="button" onClick={() => add(product)} disabled={soldOut || emptyCourse} className="m2-btn m2-btn-sm mt-1.5">
            <ShoppingCart className="h-4 w-4" aria-hidden /> {soldOut ? "Sold out" : emptyCourse ? "Opens soon" : "Add to cart"}
          </button>
        )}
      </div>
    </article>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="m2-panel px-6 py-12 grid justify-items-center gap-2 text-center">
      <span className="m2-ink3">{icon}</span>
      <p className="text-lg font-extrabold">{title}</p>
      {children && <div className="text-sm m2-ink2 max-w-sm">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
