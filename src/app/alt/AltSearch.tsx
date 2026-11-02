import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { productTypeLabel, PRODUCT_TYPE_LABELS } from "../utils/productTypes";
import { AltProductCard } from "./AltProductCard";
import { CardSkeleton, naira, saving, useCatalog, type AltProduct } from "./shared";

const PAGE = 24;

const SORTS: Record<string, string> = {
  relevance: "Best match",
  featured: "Featured",
  "price-low": "Price: low to high",
  "price-high": "Price: high to low",
  rating: "Top rated",
  discount: "Biggest saving",
};

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: `Under ${naira(5000)}`, max: 5000 },
  { label: `${naira(5000)} – ${naira(20000)}`, min: 5000, max: 20000 },
  { label: `${naira(20000)} – ${naira(50000)}`, min: 20000, max: 50000 },
  { label: `Over ${naira(50000)}`, min: 50000 },
];

const words = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean);

function haystack(p: AltProduct) {
  return [p.name, p.description, ...(p.categories ?? []), p.merchantName ?? "", productTypeLabel(p.productType)].join(" ").toLowerCase();
}

type Filters = {
  q: string; category: string | null; type: string | null; cod: boolean; rating: boolean;
  stock: boolean; deals: boolean; min: number | null; max: number | null; sort: string;
};

function readFilters(params: URLSearchParams, hasQuery: boolean): Filters {
  const num = (k: string) => (params.get(k) && !isNaN(Number(params.get(k))) ? Number(params.get(k)) : null);
  return {
    q: params.get("q") ?? "",
    category: params.get("category"),
    type: params.get("type"),
    cod: params.get("cod") === "1",
    rating: params.get("rating") === "4",
    stock: params.get("stock") === "1",
    deals: params.get("deals") === "1",
    min: num("min"),
    max: num("max"),
    sort: params.get("sort") && SORTS[params.get("sort")!] ? params.get("sort")! : hasQuery ? "relevance" : "featured",
  };
}

// Every filter except `skip`, so each option can show how many it would leave.
function matches(p: AltProduct, f: Filters, terms: string[], skip?: keyof Filters) {
  if (terms.length && skip !== "q") {
    const h = haystack(p);
    if (!terms.every((t) => h.includes(t))) return false;
  }
  if (f.category && skip !== "category" && !p.categories?.includes(f.category)) return false;
  if (f.type && skip !== "type" && (p.productType || "physical") !== f.type) return false;
  if (f.cod && skip !== "cod" && !p.codEligible) return false;
  if (f.rating && skip !== "rating" && !((p.reviewCount ?? 0) > 0 && (p.avgRating ?? 0) >= 4)) return false;
  if (f.stock && skip !== "stock" && !p.inStock) return false;
  if (f.deals && skip !== "deals" && !saving(p)) return false;
  if (skip !== "min" && f.min != null && p.price < f.min) return false;
  if (skip !== "min" && f.max != null && p.price > f.max) return false;
  return true;
}

function sortProducts(list: AltProduct[], sort: string, terms: string[], order: Map<string, number>) {
  const out = [...list];
  const nameHits = (p: AltProduct) => terms.filter((t) => p.name.toLowerCase().includes(t)).length;
  switch (sort) {
    case "price-low": return out.sort((a, b) => a.price - b.price);
    case "price-high": return out.sort((a, b) => b.price - a.price);
    case "rating": return out.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    case "discount": return out.sort((a, b) => (saving(b)?.percent ?? 0) - (saving(a)?.percent ?? 0));
    case "relevance": return out.sort((a, b) => nameHits(b) - nameHits(a) || (order.get(a.id)! - order.get(b.id)!));
    // "Featured": the store's own order, as the shop owners arranged it.
    default: return out.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
}

// The listing: search, filters with counts, sort, grid, "Load more". Used by
// /alt/search over the whole catalogue and by a shop page over its products.
export function Listing({ products, loading, title, showSeller = true }: {
  products: AltProduct[]; loading: boolean; title?: string; showSeller?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const f = readFilters(params, !!params.get("q"));
  const terms = words(f.q);
  const [shown, setShown] = useState(PAGE);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => setShown(PAGE), [params]);
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const order = useMemo(() => new Map(products.map((p, i) => [p.id, i])), [products]);
  const results = useMemo(
    () => sortProducts(products.filter((p) => matches(p, f, terms)), f.sort, terms, order),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, params, order]
  );

  const count = (skip: keyof Filters, test: (p: AltProduct) => boolean) =>
    products.filter((p) => matches(p, f, terms, skip) && test(p)).length;

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const categories = useMemo(() => {
    const names = new Set<string>();
    products.forEach((p) => p.categories?.forEach((c) => names.add(c)));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [products]);
  const types = Object.keys(PRODUCT_TYPE_LABELS).filter((t) => products.some((p) => (p.productType || "physical") === t));

  const active: { label: string; clear: Record<string, null> }[] = [
    f.q && { label: `“${f.q}”`, clear: { q: null } },
    f.category && { label: f.category, clear: { category: null } },
    f.type && { label: productTypeLabel(f.type), clear: { type: null } },
    f.cod && { label: "Pay on delivery", clear: { cod: null } },
    f.rating && { label: "4★ & up", clear: { rating: null } },
    f.stock && { label: "In stock", clear: { stock: null } },
    f.deals && { label: "Deals", clear: { deals: null } },
    (f.min != null || f.max != null) && {
      label: f.max == null ? `Over ${naira(f.min!)}` : f.min == null ? `Under ${naira(f.max)}` : `${naira(f.min)} – ${naira(f.max)}`,
      clear: { min: null, max: null },
    },
  ].filter(Boolean) as any[];

  const toggle = (k: string, on: boolean, label: string, n: number) => (
    <label key={k} className="flex items-center justify-between gap-3 py-1.5 cursor-pointer text-sm">
      <span className="flex items-center gap-2.5">
        <input type="checkbox" checked={on} onChange={() => set({ [k]: on ? null : k === "rating" ? "4" : "1" })}
          className="h-4 w-4 accent-[var(--a-accent)]" />
        {label}
      </span>
      <span className="alt-muted tabular-nums text-xs">{n}</span>
    </label>
  );

  const panel = (
    <div className="grid gap-5">
      <fieldset className="grid gap-0.5">
        <legend className="font-bold text-sm mb-1.5">Show only</legend>
        {toggle("cod", f.cod, "Pay on delivery", count("cod", (p) => p.codEligible))}
        {toggle("stock", f.stock, "In stock", count("stock", (p) => p.inStock))}
        {toggle("deals", f.deals, "Deals", count("deals", (p) => !!saving(p)))}
        {toggle("rating", f.rating, "4★ & up", count("rating", (p) => (p.reviewCount ?? 0) > 0 && (p.avgRating ?? 0) >= 4))}
      </fieldset>
      {categories.length > 0 && (
        <fieldset className="grid gap-0.5">
          <legend className="font-bold text-sm mb-1.5">Category</legend>
          {categories.map((c) => (
            <label key={c} className="flex items-center justify-between gap-3 py-1.5 cursor-pointer text-sm">
              <span className="flex items-center gap-2.5 min-w-0">
                <input type="radio" name="category" checked={f.category === c} onChange={() => set({ category: c })}
                  className="h-4 w-4 accent-[var(--a-accent)]" />
                <span className="truncate">{c}</span>
              </span>
              <span className="alt-muted tabular-nums text-xs">{count("category", (p) => !!p.categories?.includes(c))}</span>
            </label>
          ))}
          {f.category && <button type="button" onClick={() => set({ category: null })} className="alt-link text-sm text-left mt-1">Any category</button>}
        </fieldset>
      )}
      {types.length > 1 && (
        <fieldset className="grid gap-0.5">
          <legend className="font-bold text-sm mb-1.5">Type</legend>
          {types.map((t) => (
            <label key={t} className="flex items-center justify-between gap-3 py-1.5 cursor-pointer text-sm">
              <span className="flex items-center gap-2.5">
                <input type="radio" name="type" checked={(f.type ?? "") === t} onChange={() => set({ type: t })}
                  className="h-4 w-4 accent-[var(--a-accent)]" />
                {productTypeLabel(t)}
              </span>
              <span className="alt-muted tabular-nums text-xs">{count("type", (p) => (p.productType || "physical") === t)}</span>
            </label>
          ))}
          {f.type && <button type="button" onClick={() => set({ type: null })} className="alt-link text-sm text-left mt-1">Any type</button>}
        </fieldset>
      )}
      <fieldset className="grid gap-0.5">
        <legend className="font-bold text-sm mb-1.5">Price</legend>
        {PRICE_BANDS.map((b) => {
          const on = f.min === (b.min ?? null) && f.max === (b.max ?? null);
          return (
            <label key={b.label} className="flex items-center justify-between gap-3 py-1.5 cursor-pointer text-sm">
              <span className="flex items-center gap-2.5">
                <input type="radio" name="price" checked={on} onChange={() => set({ min: b.min?.toString() ?? null, max: b.max?.toString() ?? null })}
                  className="h-4 w-4 accent-[var(--a-accent)]" />
                {b.label}
              </span>
              <span className="alt-muted tabular-nums text-xs">
                {count("min", (p) => (b.min == null || p.price >= b.min) && (b.max == null || p.price <= b.max))}
              </span>
            </label>
          );
        })}
        {(f.min != null || f.max != null) && (
          <button type="button" onClick={() => set({ min: null, max: null })} className="alt-link text-sm text-left mt-1">Any price</button>
        )}
      </fieldset>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr] lg:gap-8 items-start">
      <aside className="hidden lg:block alt-card p-4 sticky top-24" aria-label="Filters">{panel}</aside>

      <div className="grid gap-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title && <h1 className="text-2xl font-extrabold">{title}</h1>}
            <p className="text-sm alt-soft" aria-live="polite">
              {loading ? "Finding products…" : `${results.length.toLocaleString()} result${results.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="alt-muted">Sort</span>
            <select value={f.sort} onChange={(e) => set({ sort: e.target.value })} className="alt-input" style={{ width: "auto", minHeight: 40 }}>
              {Object.entries(SORTS).filter(([k]) => k !== "relevance" || terms.length > 0).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Phones: quick chips and a Filters sheet. */}
        <div className="lg:hidden flex gap-2 overflow-x-auto alt-scroll -mx-1 px-1 py-0.5">
          <button type="button" className="alt-chip" onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters{active.length ? ` (${active.length})` : ""}
          </button>
          <button type="button" className="alt-chip" aria-pressed={f.cod} onClick={() => set({ cod: f.cod ? null : "1" })}>Pay on delivery</button>
          <button type="button" className="alt-chip" aria-pressed={f.rating} onClick={() => set({ rating: f.rating ? null : "4" })}>4★ & up</button>
          <button type="button" className="alt-chip" aria-pressed={f.deals} onClick={() => set({ deals: f.deals ? null : "1" })}>Deals</button>
          <button type="button" className="alt-chip" aria-pressed={f.stock} onClick={() => set({ stock: f.stock ? null : "1" })}>In stock</button>
        </div>

        {active.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {active.map((a) => (
              <button key={a.label} type="button" onClick={() => set(a.clear)} className="alt-tag alt-tag-plain" style={{ padding: "4px 8px" }}>
                {a.label} <X className="h-3 w-3" aria-label="Remove" />
              </button>
            ))}
            <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="alt-link text-xs font-semibold">Clear all</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)
            : results.slice(0, shown).map((p) => <AltProductCard key={p.id} product={p} showSeller={showSeller} />)}
        </div>

        {!loading && results.length === 0 && (
          <div className="alt-card p-8 text-center grid gap-2 justify-items-center">
            <p className="font-bold">Nothing matches that yet</p>
            <p className="text-sm alt-soft">Try fewer words or remove a filter.</p>
            {active.length > 0 && <button type="button" className="alt-btn-ghost mt-2" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</button>}
          </div>
        )}

        {results.length > shown && (
          <div className="grid justify-items-center gap-1 pt-2">
            <p className="text-xs alt-muted">Showing {shown} of {results.length}</p>
            <button type="button" className="alt-btn-ghost" onClick={() => setShown((n) => n + PAGE)}>Load more</button>
          </div>
        )}
      </div>

      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="absolute inset-0" style={{ background: "var(--a-scrim)" }} aria-label="Close filters" onClick={() => setSheetOpen(false)} />
          <div className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-2xl p-4"
            style={{ background: "var(--a-surface)", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-extrabold text-lg">Filters</p>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="p-2 -mr-2"><X className="h-5 w-5" /></button>
            </div>
            {panel}
            <button type="button" className="alt-btn w-full mt-5" onClick={() => setSheetOpen(false)}>
              Show {results.length} result{results.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AltSearch() {
  const { products, loading, error } = useCatalog();
  const [params] = useSearchParams();
  const q = params.get("q");
  const category = params.get("category");

  return (
    <div className="alt-wrap py-5">
      {error && <p className="mb-4" style={{ color: "var(--a-bad)" }}>We couldn't load products just now. Please refresh the page.</p>}
      <Listing products={products} loading={loading} title={q ? `Results for “${q}”` : category ?? "All products"} />
    </div>
  );
}
