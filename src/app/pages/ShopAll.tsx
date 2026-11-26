import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Filter, X } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { ProductCard, type ShopProduct } from "../components/ProductCard";
import { categoryShelf, sponsoredFor, storeFirst, useHomePromotions } from "../home/useStoreHome";
import { saving, useCatalog, type AltProduct } from "../alt/shared";

// The Classic theme's Shop all (every product, the store's own and every
// shop's) and its category pages (the store's own, after what shops placed
// there today). Filters live in the address, as in the other themes, so the
// home page's links (?deals=1, ?cod=1, ?house=1...) open the same lists.

const SORTS = [
  ["featured", "Featured"], ["price-low", "Price: Low to High"], ["price-high", "Price: High to Low"],
  ["rating", "Best rated"], ["discount", "Biggest saving"], ["name", "Name: A to Z"],
] as const;

const TYPES = [["physical", "Physical"], ["digital", "Digital"], ["course", "Courses"], ["ticket", "Tickets"]] as const;

function useFilters() {
  const [params, setParams] = useSearchParams();
  const num = (k: string) => { const v = params.get(k); return v && !isNaN(Number(v)) ? Number(v) : null; };
  const f = {
    q: (params.get("q") ?? "").trim().toLowerCase(),
    category: params.get("category"),
    house: params.get("house") === "1",
    deals: params.get("deals") === "1",
    cod: params.get("cod") === "1",
    rating: num("rating"),
    max: num("max"),
    type: params.get("type"),
    sort: params.get("sort") ?? "featured",
  };
  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v === null || v === "" ? next.delete(k) : next.set(k, v));
    setParams(next, { replace: true });
  };
  return { f, set };
}

function ShopGrid({ products, loading, error, title, subtitle, categories, sponsored }: {
  products: AltProduct[]; loading: boolean; error: boolean; title: string; subtitle?: string;
  // The category buttons to offer; none on a category page.
  categories?: string[];
  sponsored: Set<string>;
}) {
  const { f, set } = useFilters();

  const shown = useMemo(() => {
    let list = products.filter((p) =>
      (!f.q || `${p.name} ${p.merchantName ?? ""} ${(p.categories ?? []).join(" ")}`.toLowerCase().includes(f.q)) &&
      (!f.category || p.categories?.includes(f.category)) &&
      (!f.house || !p.merchantId) &&
      (!f.deals || (!!saving(p) && p.inStock)) &&
      (!f.cod || (p.codEligible && p.inStock)) &&
      (f.rating == null || ((p.reviewCount ?? 0) > 0 && (p.avgRating ?? 0) >= f.rating)) &&
      (f.max == null || p.price <= f.max) &&
      (!f.type || p.productType === f.type));
    const by: Record<string, (a: AltProduct, b: AltProduct) => number> = {
      "price-low": (a, b) => a.price - b.price,
      "price-high": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name),
      rating: (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
      discount: (a, b) => (saving(b)?.percent ?? 0) - (saving(a)?.percent ?? 0),
    };
    if (by[f.sort]) list = [...list].sort(by[f.sort]);
    return list;
  }, [products, f.q, f.category, f.house, f.deals, f.cod, f.rating, f.max, f.type, f.sort]);

  const chips = [
    f.house && { label: "Our store", clear: { house: null } },
    f.deals && { label: "Deals", clear: { deals: null } },
    f.cod && { label: "Pay on delivery", clear: { cod: null } },
    f.rating != null && { label: `${f.rating}★ and up`, clear: { rating: null } },
    f.max != null && { label: `Up to ₦${f.max.toLocaleString()}`, clear: { max: null } },
    f.q && { label: `“${f.q}”`, clear: { q: null } },
  ].filter(Boolean) as { label: string; clear: Record<string, null> }[];

  const pill = (active: boolean) => ({
    backgroundColor: active ? 'var(--color-primary)' : 'var(--color-product-card)',
    color: active ? 'var(--color-primary-ink)' : 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  });

  return (
    <div style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-6">
        <header>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
          {subtitle && <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
        </header>

        <div className="grid gap-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input type="search" defaultValue={f.q} placeholder="Search these products" aria-label="Search these products"
              onKeyDown={(e) => { if (e.key === "Enter") set({ q: (e.target as HTMLInputElement).value }); }}
              className="flex-1 min-w-0 px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-product-card)' }} />
            <select value={f.type ?? ""} onChange={(e) => set({ type: e.target.value })} aria-label="Product type" className="px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-product-card)' }}>
              <option value="">Every type</option>
              {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <select value={f.sort} onChange={(e) => set({ sort: e.target.value === "featured" ? null : e.target.value })} aria-label="Sort" className="px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-product-card)' }}>
              {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>

          {categories && categories.length > 0 && (
            <div className="flex items-center gap-2 min-w-0">
              <Filter className="h-5 w-5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} aria-hidden />
              <div className="category-scroll flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible min-w-0 py-1">
                {[null, ...categories].map((c) => (
                  <button key={c ?? "all"} type="button" onClick={() => set({ category: c })} className="shrink-0 px-4 py-2 rounded-full text-sm font-medium" style={pill(f.category === c)}>
                    {c ?? "All"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c.label} type="button" onClick={() => set(c.clear)} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={pill(false)}>
                  {c.label} <X className="h-3.5 w-3.5" aria-label="Remove" />
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Loading products...</p>}
        {error && <p style={{ color: 'var(--color-error)' }}>Couldn't load products. Please try again later.</p>}
        {!loading && !error && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{shown.length} product{shown.length === 1 ? "" : "s"}</p>}
        {!loading && !error && shown.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>No products match your filters.</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {shown.map((p) => <ProductCard key={p.id} product={p as ShopProduct} sponsored={f.sort === "featured" && sponsored.has(p.id)} />)}
        </div>
      </div>
    </div>
  );
}

export function ShopAll() {
  const { products, loading, error } = useCatalog();
  const promos = useHomePromotions();
  const { data: cats } = useAPI(`${API_BASE}/categories?type=product`);
  const [params] = useSearchParams();
  const category = params.get("category");
  const ordered = useMemo(() => storeFirst(products, promos, category), [products, promos, category]);
  const house = params.get("house") === "1";
  return (
    <ShopGrid products={ordered} loading={loading} error={error} sponsored={sponsoredFor(promos, category)}
      title={house ? "Our store" : "Shop all"} subtitle={house ? "Everything we sell ourselves" : "Every product, from our store and every shop"}
      categories={((cats ?? []) as { name: string }[]).map((c) => c.name)} />
  );
}

export function ClassicCategory() {
  const { name = "" } = useParams();
  const { products, loading, error } = useCatalog();
  const promos = useHomePromotions();
  const shelf = useMemo(() => categoryShelf(products, promos, name), [products, promos, name]);
  return (
    <>
      <ShopGrid products={shelf} loading={loading} error={error} sponsored={sponsoredFor(promos, name)} title={name} />
      <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Looking for more? <Link to={`/shop?category=${encodeURIComponent(name)}`} className="underline" style={{ color: 'var(--color-primary)' }}>See {name} from every shop</Link>
      </p>
    </>
  );
}
