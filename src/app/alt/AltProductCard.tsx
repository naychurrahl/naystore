import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useCart } from "../context/CartContext";
import { isPhysical, productTypeLabel } from "../utils/productTypes";
import { formatEventTime } from "../utils/eventTime";
import { altPath, naira, productPath, saving, sellerPath, Stars, type AltProduct } from "./shared";

// Square photo, two-line name, stars only when there are reviews, an old
// price only when it really was higher, how it can be paid, who sells it.
export function AltProductCard({ product, showSeller = true, sponsored = false }: { product: AltProduct; showSeller?: boolean; sponsored?: boolean }) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const off = saving(product);
  const physical = isPhysical(product.productType);
  const ticket = product.productType === "ticket";
  const soldOut = physical && !product.inStock;

  const add = () => {
    addItem(product, 1);
    toast.success(`Added ${product.name} to cart`, { action: { label: "View cart", onClick: () => navigate(altPath("/cart")) } });
  };

  return (
    <article className="alt-card overflow-hidden flex flex-col h-full group">
      <Link to={productPath(product.id)} className="relative block aspect-square overflow-hidden" style={{ background: "var(--a-sunk)" }}>
        <ImageWithFallback src={product.image} alt={product.name} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {off && <span className="alt-tag" style={{ background: "var(--a-deal)", color: "#fff" }}>−{off.percent}%</span>}
          {sponsored && <span className="alt-tag alt-tag-plain">Sponsored</span>}
          {product.badge && <span className="alt-tag alt-tag-plain">{product.badge}</span>}
        </div>
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 py-1.5 text-center text-xs font-bold" style={{ background: "var(--a-scrim)", color: "#fff" }}>
            Sold out
          </span>
        )}
      </Link>

      <div className="p-3 flex flex-col gap-1.5 flex-1 min-w-0">
        {!physical && <span className="alt-tag alt-tag-info self-start">{productTypeLabel(product.productType)}</span>}
        <Link to={productPath(product.id)} className="font-semibold text-[15px] leading-snug line-clamp-2 hover:underline">
          {product.name}
        </Link>
        {!!product.reviewCount && product.avgRating != null && (
          <span className="flex items-center gap-1 text-xs alt-muted">
            <Stars rating={product.avgRating} size={12} /> {product.avgRating} ({product.reviewCount})
          </span>
        )}
        {product.eventStartsAt && (
          <span className="flex items-center gap-1 text-xs alt-soft">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatEventTime(product.eventStartsAt)} WAT
          </span>
        )}
        <div className="flex items-baseline flex-wrap gap-x-2 mt-auto pt-1">
          <span className="alt-price text-lg">{ticket && <span className="text-xs font-semibold alt-muted">from </span>}{naira(product.price)}</span>
          {off && <span className="alt-was text-sm">{naira(off.was)}</span>}
        </div>
        {physical && product.inStock && product.codEligible && (
          <span className="text-xs font-semibold" style={{ color: "var(--a-good)" }}>Pay on delivery</span>
        )}
        {showSeller && product.merchantSlug && (
          <Link to={sellerPath(product.merchantSlug)} className="text-xs alt-muted hover:underline truncate">
            {product.merchantName}
          </Link>
        )}
        {ticket ? (
          <Link to={productPath(product.id)} className="alt-btn-ghost alt-btn-sm mt-1">Get tickets</Link>
        ) : (
          <button type="button" onClick={add} disabled={soldOut || (product.productType === "course" && !product.lessonCount)}
            className="alt-btn alt-btn-sm mt-1">
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
        )}
      </div>
    </article>
  );
}
