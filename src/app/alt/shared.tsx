import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { apiFetch } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import type { ShopProduct } from "../components/ProductCard";

export type AltProduct = ShopProduct & {
  merchantId?: string | null;
  stockQuantity?: number | null;
  media?: { type: "image" | "video"; url: string }[];
  lessonCount?: number;
};

// Prices: whole naira with separators (₦15,000), kobo only when there are any.
export function naira(amount: number): string {
  const n = Number(amount) || 0;
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}

// An old price is shown only when it really was higher.
export function saving(p: { price: number; originalPrice?: number | null }) {
  const was = p.originalPrice ?? 0;
  if (!(was > p.price)) return null;
  return { was, amount: was - p.price, percent: Math.round(((was - p.price) / was) * 100) };
}

export const altPath = (path = "") => path || "/";
export const productPath = (id: string) => altPath(`/shop/${id}`);
export const sellerPath = (slug: string) => altPath(`/sellers/${slug}`);

// The whole catalogue, fetched once per visit and shared by every themed page
// (the API returns every visible product in one list; search runs over it).
type Catalog = { products: AltProduct[]; loading: boolean; error: boolean };
let catalogPromise: Promise<AltProduct[]> | null = null;
let catalogCache: AltProduct[] | null = null;

function loadCatalog(): Promise<AltProduct[]> {
  if (!catalogPromise) {
    catalogPromise = apiFetch(`${API_BASE}/products`)
      .then((rows: AltProduct[]) => (catalogCache = rows ?? []))
      .catch((err: unknown) => {
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

export function useCatalog(): Catalog {
  const [state, setState] = useState<Catalog>(
    catalogCache ? { products: catalogCache, loading: false, error: false } : { products: [], loading: true, error: false }
  );
  useEffect(() => {
    if (catalogCache) return;
    let live = true;
    loadCatalog()
      .then((products) => live && setState({ products, loading: false, error: false }))
      .catch(() => live && setState({ products: [], loading: false, error: true }));
    return () => { live = false; };
  }, []);
  return state;
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} width={size} height={size} aria-hidden
          fill={n <= Math.round(rating) ? "var(--a-star)" : "none"} style={{ color: "var(--a-star)" }} />
      ))}
    </span>
  );
}

// A grey card shape while products load: never a bare "Loading…" line.
export function CardSkeleton() {
  return (
    <div className="alt-card overflow-hidden" aria-hidden>
      <div className="alt-skel aspect-square" style={{ borderRadius: 0 }} />
      <div className="p-3 grid gap-2">
        <div className="alt-skel h-4 w-11/12" />
        <div className="alt-skel h-4 w-2/3" />
        <div className="alt-skel h-5 w-1/2" />
      </div>
    </div>
  );
}

// Settings bits the header and footer share.
export function contactsOf(settings: any) {
  const phone: string | null = settings?.phones?.[0]?.value ?? null;
  const socials: { id: string; platform: string; url: string }[] = settings?.socialLinks ?? [];
  const whatsapp = socials.find((s) => /whats\s*app|wa\.me/i.test(`${s.platform} ${s.url}`))?.url ?? null;
  return { phone, whatsapp, socials, emails: settings?.emails ?? [], addresses: settings?.addresses ?? [] };
}
