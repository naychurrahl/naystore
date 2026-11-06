import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ChevronRight, PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useSellers } from "./sellers";
import { productTypeLabel, PRODUCT_TYPE_LABELS } from "../utils/productTypes";
import { useShopState } from "./local";
import { sponsoredFor, storeFirst, useHomePromotions } from "../home/useStoreHome";
import { CardSkeleton, categoryUrl, EmptyState, m2, naira, ProductCard, saving, useCatalog, type AltProduct } from "./ui";

const PAGE = 24;
const SORTS: Record<string, string> = {
  relevance: "Best match", featured: "Featured", "price-low": "Price: low to high",
  "price-high": "Price: high to low", rating: "Top rated", discount: "Biggest saving",
};

type F = {
  q: string; category: string | null; store: string | null; house: boolean; type: string | null; cod: boolean; rating: boolean;
  stock: boolean; deals: boolean; near: boolean; min: number | null; max: number | null; sort: string;
};

function read(params: URLSearchParams, fixedCategory?: string): F {
  const num = (k: string) => { const v = params.get(k); return v && !isNaN(Number(v)) && v.trim() !== "" ? Number(v) : null; };
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "";
  return {
    q, category: fixedCategory ?? params.get("category"), store: params.get("store"), house: params.get("house") === "1", type: params.get("type"),
    cod: params.get("cod") === "1", rating: params.get("rating") === "4", stock: params.get("stock") === "1",
    deals: params.get("deals") === "1", near: params.get("near") === "1", min: num("min"), max: num("max"),
    sort: SORTS[sort] ? sort : q ? "relevance" : "featured",
  };
}

const text = (p: AltProduct) => [p.name, p.description, ...(p.categories ?? []), p.merchantName ?? "", productTypeLabel(p.productType)].join(" ").toLowerCase();

// Every filter but `skip`, so each option can say how many it would leave.
function keep(p: AltProduct, f: F, words: string[], storeStates: Map<string, string>, myState: string, skip?: keyof F) {
  if (words.length && skip !== "q" && !words.every((w) => text(p).includes(w))) return false;
  if (f.category && skip !== "category" && !p.categories?.includes(f.category)) return false;
  if (f.store && skip !== "store" && p.merchantSlug !== f.store) return false;
  if (f.house && skip !== "house" && p.merchantId) return false;
  if (f.type && skip !== "type" && (p.productType || "physical") !== f.type) return false;
  if (f.cod && skip !== "cod" && !p.codEligible) return false;
  if (f.rating && skip !== "rating" && !((p.reviewCount ?? 0) > 0 && (p.avgRating ?? 0) >= 4)) return false;
  if (f.stock && skip !== "stock" && !p.inStock) return false;
  if (f.deals && skip !== "deals" && !saving(p)) return false;
  if (f.near && skip !== "near" && !(myState && p.merchantSlug && storeStates.get(p.merchantSlug) === myState)) return false;
  if (skip !== "min" && f.min != null && p.price < f.min) return false;
  if (skip !== "min" && f.max != null && p.price > f.max) return false;
  return true;
}

function order(list: AltProduct[], f: F, words: string[], pos: Map<string, number>) {
  const out = [...list];
  const nameHits = (p: AltProduct) => words.filter((w) => p.name.toLowerCase().includes(w)).length;
  const by = (a: AltProduct, b: AltProduct) => pos.get(a.id)! - pos.get(b.id)!;
  switch (f.sort) {
    case "price-low": return out.sort((a, b) => a.price - b.price);
    case "price-high": return out.sort((a, b) => b.price - a.price);
    case "rating": return out.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    case "discount": return out.sort((a, b) => (saving(b)?.percent ?? 0) - (saving(a)?.percent ?? 0));
    case "relevance": return out.sort((a, b) => nameHits(b) - nameHits(a) || by(a, b));
    default: return out.sort(by);
  }
}

function Option({ type = "checkbox", name, checked, onChange, label, count }: {
  type?: "checkbox" | "radio"; name?: string; checked: boolean; onChange: () => void; label: ReactNode; count: number;
}) {
  return (
    <label className={`flex items-center justify-between gap-3 py-1.5 text-sm cursor-pointer ${count === 0 && !checked ? "opacity-50" : ""}`}>
      <span className="flex items-center gap-2.5 min-w-0">
        <input type={type} name={name} checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-[var(--m-accent)]" />
        <span className="truncate">{label}</span>
      </span>
      <span className="m2-num text-xs m2-ink3">{count}</span>
    </label>
  );
}

function PriceForm({ min, max, onApply }: { min: number | null; max: number | null; onApply: (lo: string | null, hi: string | null) => void }) {
  const [lo, setLo] = useState(min?.toString() ?? "");
  const [hi, setHi] = useState(max?.toString() ?? "");
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); onApply(lo.replace(/\D/g, "") || null, hi.replace(/\D/g, "") || null); }}>
      <input aria-label="Lowest price" inputMode="numeric" placeholder="₦ Min" value={lo} onChange={(e) => setLo(e.target.value)} className="m2-input" style={{ minHeight: 38 }} />
      <span className="m2-ink3">–</span>
      <input aria-label="Highest price" inputMode="numeric" placeholder="₦ Max" value={hi} onChange={(e) => setHi(e.target.value)} className="m2-input" style={{ minHeight: 38 }} />
      <button type="submit" className="m2-btn-line m2-btn-sm">Go</button>
    </form>
  );
}

// Search and filter over a list of products: used by search, every category,
// and each store's page. Filters live in the address, so results can be shared.
export function Listing({ products, loading, fixedCategory, showStore = true, storeStates, heading, searchLabel }: {
  products: AltProduct[]; loading: boolean; fixedCategory?: string; showStore?: boolean;
  storeStates?: Map<string, string>; heading?: ReactNode; searchLabel?: string;
}) {
  const [params, setParams] = useSearchParams();
  const f = read(params, fixedCategory);
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const myState = useShopState();
  const states = useMemo(() => storeStates ?? new Map<string, string>(), [storeStates]);
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState(false);
  const [qDraft, setQDraft] = useState(f.q);

  useEffect(() => { setShown(PAGE); setQDraft(params.get("q") ?? ""); }, [params]);
  useEffect(() => {
    if (!sheet) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [sheet]);

  // Across shops, the default order is the store's own and what's promoted
  // first; a chosen sort stays exactly as chosen, and only says "Sponsored"
  // where being paid for moved something up. One shop's own page keeps its order.
  const promos = useHomePromotions();
  const pos = useMemo(() => new Map((showStore ? storeFirst(products, promos, f.category) : products).map((p, i) => [p.id, i])), [products, promos, showStore, f.category]);
  const sponsored = useMemo(() => (showStore && (f.sort === "featured" || f.sort === "relevance") ? sponsoredFor(promos, f.category) : new Set<string>()), [promos, showStore, f.sort, f.category]);
  const results = useMemo(() => order(products.filter((p) => keep(p, f, words, states, myState)), f, words, pos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, params, myState, states, pos, fixedCategory]);
  const count = (skip: keyof F, test: (p: AltProduct) => boolean) => products.filter((p) => keep(p, f, words, states, myState, skip) && test(p)).length;

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) v == null || v === "" ? next.delete(k) : next.set(k, v);
    setParams(next, { replace: true });
  };
  const flip = (k: keyof F, on: boolean, value = "1") => set({ [k]: on ? null : value });

  const categories = useMemo(() => [...new Set(products.flatMap((p) => p.categories ?? []))].sort((a, b) => a.localeCompare(b)), [products]);
  const stores = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.merchantSlug && m.set(p.merchantSlug, p.merchantName ?? ""));
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);
  const types = Object.keys(PRODUCT_TYPE_LABELS).filter((t) => products.some((p) => (p.productType || "physical") === t));
  const storeName = stores.find(([s]) => s === f.store)?.[1];

  const chips: { label: string; clear: Record<string, null> }[] = [
    f.q ? { label: `“${f.q}”`, clear: { q: null } } : null,
    f.category && !fixedCategory ? { label: f.category, clear: { category: null } } : null,
    f.store ? { label: storeName ?? "Shop", clear: { store: null } } : null,
    f.house ? { label: "Our store", clear: { house: null } } : null,
    f.type ? { label: productTypeLabel(f.type), clear: { type: null } } : null,
    f.cod ? { label: "Pay on delivery", clear: { cod: null } } : null,
    f.rating ? { label: "4★ & up", clear: { rating: null } } : null,
    f.stock ? { label: "In stock", clear: { stock: null } } : null,
    f.deals ? { label: "On sale", clear: { deals: null } } : null,
    f.near ? { label: `Sent from ${myState}`, clear: { near: null } } : null,
    f.min != null || f.max != null ? {
      label: f.max == null ? `From ${naira(f.min!)}` : f.min == null ? `Up to ${naira(f.max)}` : `${naira(f.min)} – ${naira(f.max)}`,
      clear: { min: null, max: null },
    } : null,
  ].filter(Boolean) as any[];
  const clearAll = () => setParams(new URLSearchParams(f.sort !== "featured" && f.sort !== "relevance" ? { sort: f.sort } : {}), { replace: true });

  const panel = (
    <div className="grid gap-5">
      <fieldset>
        <legend className="font-bold text-sm mb-1">Availability & payment</legend>
        <Option checked={f.stock} onChange={() => flip("stock", f.stock)} label="In stock" count={count("stock", (p) => p.inStock)} />
        <Option checked={f.cod} onChange={() => flip("cod", f.cod)} label="Pay on delivery" count={count("cod", (p) => p.codEligible)} />
        <Option checked={f.deals} onChange={() => flip("deals", f.deals)} label="On sale" count={count("deals", (p) => !!saving(p))} />
        {myState && storeStates && (
          <Option checked={f.near} onChange={() => flip("near", f.near)} label={`Sent from ${myState}`}
            count={count("near", (p) => !!p.merchantSlug && states.get(p.merchantSlug) === myState)} />
        )}
      </fieldset>
      <fieldset>
        <legend className="font-bold text-sm mb-1">Customer rating</legend>
        <Option checked={f.rating} onChange={() => flip("rating", f.rating, "4")} label="4★ & up" count={count("rating", (p) => (p.reviewCount ?? 0) > 0 && (p.avgRating ?? 0) >= 4)} />
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="font-bold text-sm mb-1">Price</legend>
        <PriceForm key={`${f.min}-${f.max}`} min={f.min} max={f.max} onApply={(lo, hi) => set({ min: lo, max: hi })} />
        <div className="flex flex-wrap gap-1.5">
          {[[null, 5000], [5000, 20000], [20000, 50000], [50000, null]].map(([lo, hi]) => (
            <button key={`${lo}-${hi}`} type="button" className="m2-chip" style={{ height: 30, fontSize: 13 }}
              aria-pressed={f.min === lo && f.max === hi} onClick={() => set({ min: lo?.toString() ?? null, max: hi?.toString() ?? null })}>
              {hi == null ? `${naira(lo!)}+` : lo == null ? `Under ${naira(hi)}` : `${naira(lo)}–${naira(hi)}`}
            </button>
          ))}
        </div>
      </fieldset>
      {!fixedCategory && categories.length > 1 && (
        <fieldset>
          <legend className="font-bold text-sm mb-1">Category</legend>
          {categories.map((c) => <Option key={c} type="radio" name="m2-cat" checked={f.category === c} onChange={() => set({ category: c })} label={c} count={count("category", (p) => !!p.categories?.includes(c))} />)}
          {f.category && <button type="button" className="m2-link text-sm mt-1" onClick={() => set({ category: null })}>Any category</button>}
        </fieldset>
      )}
      {showStore && stores.length > 1 && (
        <fieldset>
          <legend className="font-bold text-sm mb-1">Shop</legend>
          {stores.map(([slug, name]) => <Option key={slug} type="radio" name="m2-store" checked={f.store === slug} onChange={() => set({ store: slug })} label={name} count={count("store", (p) => p.merchantSlug === slug)} />)}
          {f.store && <button type="button" className="m2-link text-sm mt-1" onClick={() => set({ store: null })}>Any shop</button>}
        </fieldset>
      )}
      {types.length > 1 && (
        <fieldset>
          <legend className="font-bold text-sm mb-1">Type</legend>
          {types.map((t) => <Option key={t} type="radio" name="m2-type" checked={(f.type ?? "") === t} onChange={() => set({ type: t })} label={productTypeLabel(t)} count={count("type", (p) => (p.productType || "physical") === t)} />)}
          {f.type && <button type="button" className="m2-link text-sm mt-1" onClick={() => set({ type: null })}>Any type</button>}
        </fieldset>
      )}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8 items-start">
      <aside aria-label="Filters" className="hidden lg:block m2-panel p-4 sticky top-[136px] max-h-[calc(100vh-152px)] overflow-y-auto">
        <p className="font-extrabold mb-3 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</p>
        {panel}
      </aside>

      <div className="grid gap-3 min-w-0">
        {heading}
        {searchLabel && (
          <form role="search" className="relative max-w-md" onSubmit={(e) => { e.preventDefault(); set({ q: qDraft.trim() || null }); }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 m2-ink3" aria-hidden />
            <input type="search" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder={searchLabel} aria-label={searchLabel}
              className="m2-input" style={{ paddingLeft: 36 }} />
          </form>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm m2-ink2" aria-live="polite">
            {loading ? "Finding products…" : <><b className="m2-num">{results.length.toLocaleString()}</b> product{results.length === 1 ? "" : "s"}</>}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="m2-ink3">Sort by</span>
            <select value={f.sort} onChange={(e) => set({ sort: e.target.value })} className="m2-input" style={{ width: "auto", minHeight: 38, fontSize: 14 }}>
              {Object.entries(SORTS).filter(([k]) => k !== "relevance" || words.length > 0).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>

        <div className="lg:hidden flex gap-2 overflow-x-auto m2-scroll -mx-1 px-1">
          <button type="button" className="m2-chip" onClick={() => setSheet(true)} style={{ background: "var(--m-ink)", color: "var(--m-surface)", borderColor: "var(--m-ink)" }}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters{chips.length ? ` · ${chips.length}` : ""}
          </button>
          <button type="button" className="m2-chip" aria-pressed={f.cod} onClick={() => flip("cod", f.cod)}>Pay on delivery</button>
          <button type="button" className="m2-chip" aria-pressed={f.stock} onClick={() => flip("stock", f.stock)}>In stock</button>
          <button type="button" className="m2-chip" aria-pressed={f.rating} onClick={() => flip("rating", f.rating, "4")}>4★ & up</button>
          <button type="button" className="m2-chip" aria-pressed={f.deals} onClick={() => flip("deals", f.deals)}>On sale</button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {chips.map((c) => (
              <button key={c.label} type="button" onClick={() => set(c.clear)} className="m2-badge m2-badge-accent" style={{ padding: "5px 8px", fontWeight: 700 }}>
                {c.label} <X className="h-3 w-3" aria-label="remove" />
              </button>
            ))}
            <button type="button" className="m2-link text-xs" onClick={clearAll}>Clear all</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)
            : results.slice(0, shown).map((p) => <ProductCard key={p.id} product={p} showStore={showStore} sponsored={sponsored.has(p.id)} />)}
        </div>

        {!loading && results.length === 0 && (
          <EmptyState icon={<PackageSearch className="h-10 w-10" />} title="No products match"
            action={chips.length > 0 ? <button type="button" className="m2-btn-line" onClick={clearAll}>Clear filters</button> : <Link to={m2("/categories")} className="m2-btn">Browse categories</Link>}>
            Try a shorter search or remove a filter.
          </EmptyState>
        )}
        {results.length > shown && (
          <div className="grid justify-items-center gap-1.5 pt-2">
            <p className="text-xs m2-ink3 m2-num">Showing {shown} of {results.length}</p>
            <button type="button" className="m2-btn-line" onClick={() => setShown((n) => n + PAGE)}>Show more</button>
          </div>
        )}
      </div>

      {sheet && (
        <div className="lg:hidden fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0" style={{ background: "var(--m-scrim)" }} onClick={() => setSheet(false)} />
          <div className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-xl m2-pop" style={{ background: "var(--m-surface)" }}>
            <div className="sticky top-0 flex items-center justify-between px-4 h-14" style={{ background: "var(--m-surface)", borderBottom: "1px solid var(--m-line)" }}>
              <p className="font-extrabold text-lg">Filters</p>
              <div className="flex items-center gap-1">
                {chips.length > 0 && <button type="button" className="m2-link text-sm px-2" onClick={clearAll}>Clear all</button>}
                <button type="button" aria-label="Close" className="m2-icon-btn" onClick={() => setSheet(false)}><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-4">{panel}</div>
            <div className="sticky bottom-0 p-4" style={{ background: "var(--m-surface)", borderTop: "1px solid var(--m-line)", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
              <button type="button" className="m2-btn w-full" onClick={() => setSheet(false)}>Show {results.length} product{results.length === 1 ? "" : "s"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Each shop's state, for "Sent from your state".
export function useStoreStates(products: AltProduct[]) {
  const profiles = useSellers(products.map((p) => p.merchantSlug));
  return useMemo(() => new Map([...profiles].map(([slug, p]) => [slug, p?.state ?? ""])), [profiles]);
}

export function SearchPage() {
  const { products, loading, error } = useCatalog();
  const [params] = useSearchParams();
  const states = useStoreStates(products);
  const q = params.get("q");
  return (
    <div className="m2-wrap py-5">
      {error && <p className="mb-3" style={{ color: "var(--m-bad)" }}>We couldn't load products just now. Please refresh the page.</p>}
      <Listing products={products} loading={loading} storeStates={states}
        heading={<h1 className="text-2xl font-extrabold">{q ? <>Results for “{q}”</> : params.get("deals") ? "Today's deals" : params.get("house") === "1" ? "Our store" : "All products"}</h1>} />
    </div>
  );
}

function categoryStats(products: AltProduct[]) {
  const m = new Map<string, AltProduct[]>();
  products.forEach((p) => p.categories?.forEach((c) => m.set(c, [...(m.get(c) ?? []), p])));
  return m;
}

export function CategoryPage() {
  const { name = "" } = useParams();
  const { products, loading } = useCatalog();
  const states = useStoreStates(products);
  const stats = useMemo(() => categoryStats(products), [products]);
  const here = stats.get(name) ?? [];
  const others = [...stats.keys()].filter((c) => c !== name).sort();

  return (
    <div className="m2-wrap py-5 grid grid-cols-[minmax(0,1fr)] gap-4">
      <nav aria-label="Breadcrumb" className="text-sm m2-ink3 flex items-center gap-1">
        <Link to={m2()} className="hover:underline">Home</Link><ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to={m2("/categories")} className="hover:underline">Categories</Link><ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="m2-ink2" aria-current="page">{name}</span>
      </nav>
      {others.length > 0 && (
        <div className="flex gap-2 overflow-x-auto m2-scroll -mx-1 px-1" aria-label="Other categories">
          <span className="m2-chip" aria-current="page">{name}</span>
          {others.map((c) => <Link key={c} to={categoryUrl(c)} className="m2-chip">{c}</Link>)}
        </div>
      )}
      <Listing products={here} loading={loading} fixedCategory={name} storeStates={states} searchLabel={`Search in ${name}`}
        heading={<h1 className="text-2xl sm:text-3xl font-extrabold">{name}</h1>} />
    </div>
  );
}

export function CategoriesPage() {
  const { products, loading } = useCatalog();
  const stats = useMemo(() => [...categoryStats(products)].sort((a, b) => b[1].length - a[1].length), [products]);
  return (
    <div className="m2-wrap py-5 grid grid-cols-[minmax(0,1fr)] gap-4">
      <h1 className="text-2xl sm:text-3xl font-extrabold">All categories</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? Array.from({ length: 8 }, (_, i) => <div key={i} className="m2-skel aspect-[4/3]" />) : stats.map(([c, list]) => (
          <Link key={c} to={categoryUrl(c)} className="m2-panel m2-lift overflow-hidden group">
            <div className="grid grid-cols-2 gap-px aspect-[4/3]" style={{ background: "var(--m-line)" }}>
              {list.slice(0, 4).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />)}
              {Array.from({ length: Math.max(0, 4 - list.length) }, (_, i) => <span key={i} style={{ background: "var(--m-sunk)" }} />)}
            </div>
            <div className="p-3 flex items-center justify-between gap-2">
              <span className="font-bold truncate group-hover:underline">{c}</span>
              <span className="text-xs m2-ink3 m2-num shrink-0">{list.length}</span>
            </div>
          </Link>
        ))}
      </div>
      {!loading && stats.length === 0 && <EmptyState icon={<PackageSearch className="h-10 w-10" />} title="No categories yet" />}
    </div>
  );
}
