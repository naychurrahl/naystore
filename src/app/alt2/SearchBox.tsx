import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Clock, LayoutGrid, Search, Store, X } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { clearSearches, rememberSearch, useRecentSearches } from "./local";
import { categoryUrl, m2, naira, productUrl, searchUrl, storeUrl, useCatalog } from "./ui";

type Suggestion = { key: string; kind: "search" | "recent" | "product" | "store" | "category"; label: string; sub?: string; image?: string; to: string };

// Search with suggestions as you type: products, shops and categories from
// the catalogue, and this browser's recent searches when the box is empty.
export function SearchBox({ onDone }: { onDone?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const onSearch = location.pathname === m2("/search");
  const [q, setQ] = useState(onSearch ? params.get("q") ?? "" : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { products } = useCatalog();
  const recent = useRecentSearches();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { if (onSearch) setQ(params.get("q") ?? ""); }, [onSearch, params]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return recent.map((r) => ({ key: `r:${r}`, kind: "recent", label: r, to: searchUrl(r) }));
    const words = term.split(/\s+/);
    const hit = (s: string) => words.every((w) => s.toLowerCase().includes(w));
    const out: Suggestion[] = [{ key: "s", kind: "search", label: q.trim(), to: searchUrl(q.trim()) }];
    const cats = new Map<string, number>();
    const stores = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      p.categories?.forEach((c) => cats.set(c, (cats.get(c) ?? 0) + 1));
      if (p.merchantSlug) {
        const s = stores.get(p.merchantSlug) ?? { name: p.merchantName ?? "", count: 0 };
        s.count++;
        stores.set(p.merchantSlug, s);
      }
    }
    [...cats].filter(([c]) => hit(c)).slice(0, 3).forEach(([c, n]) =>
      out.push({ key: `c:${c}`, kind: "category", label: c, sub: `${n} product${n === 1 ? "" : "s"}`, to: categoryUrl(c) }));
    [...stores].filter(([, s]) => hit(s.name)).slice(0, 3).forEach(([slug, s]) =>
      out.push({ key: `t:${slug}`, kind: "store", label: s.name, sub: `Shop · ${s.count} product${s.count === 1 ? "" : "s"}`, to: storeUrl(slug) }));
    products.filter((p) => hit(`${p.name} ${p.categories?.join(" ")} ${p.merchantName ?? ""}`)).slice(0, 5).forEach((p) =>
      out.push({ key: `p:${p.id}`, kind: "product", label: p.name, sub: naira(p.price), image: p.image, to: productUrl(p.id) }));
    return out;
  }, [q, products, recent]);

  const go = (s?: Suggestion) => {
    const target = s ?? (q.trim() ? { kind: "search", label: q.trim(), to: searchUrl(q.trim()) } as Suggestion : null);
    if (!target) return;
    if (target.kind === "search" || target.kind === "recent") rememberSearch(target.label);
    setOpen(false);
    setActive(-1);
    navigate(target.to);
    onDone?.();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(suggestions.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (e.key === "Escape") { setOpen(false); setActive(-1); }
    else if (e.key === "Enter") { e.preventDefault(); go(active >= 0 ? suggestions[active] : undefined); }
  };

  const showList = open && suggestions.length > 0;
  const icon = (s: Suggestion) => s.kind === "recent" ? <Clock className="h-4 w-4 m2-ink3" />
    : s.kind === "store" ? <Store className="h-4 w-4 m2-ink3" />
    : s.kind === "category" ? <LayoutGrid className="h-4 w-4 m2-ink3" />
    : <Search className="h-4 w-4 m2-ink3" />;

  return (
    <div ref={box} className="relative flex-1 min-w-0">
      <form role="search" onSubmit={(e) => { e.preventDefault(); go(active >= 0 ? suggestions[active] : undefined); }} className="flex">
        <input
          type="search" value={q} placeholder="Search products, shops and categories"
          role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} aria-label="Search the marketplace"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)} onKeyDown={onKey}
          className="m2-input flex-1 min-w-0" style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingRight: q ? 36 : 12 }}
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => { setQ(""); setOpen(true); }}
            className="absolute right-14 top-1/2 -translate-y-1/2 p-1.5 m2-ink3"><X className="h-4 w-4" /></button>
        )}
        <button type="submit" aria-label="Search" className="m2-btn" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: "0 14px" }}>
          <Search className="h-5 w-5" />
        </button>
      </form>
      {showList && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 m2-panel m2-pop overflow-hidden" style={{ boxShadow: "var(--m-shadow)" }}>
          {!q.trim() && (
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
              <span className="m2-eyebrow">Recent searches</span>
              <button type="button" className="text-xs m2-link" onClick={() => clearSearches()}>Clear</button>
            </div>
          )}
          <ul id={listId} role="listbox" aria-label="Suggestions" className="py-1 max-h-[60vh] overflow-y-auto">
            {suggestions.map((s, i) => (
              <li key={s.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); go(s); }} onMouseEnter={() => setActive(i)}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer" style={{ background: i === active ? "var(--m-sunk)" : undefined }}>
                {s.image
                  ? <ImageWithFallback src={s.image} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                  : <span className="h-9 w-9 inline-flex items-center justify-center shrink-0">{icon(s)}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm truncate">{s.kind === "search" ? <>Search for “<b>{s.label}</b>”</> : s.label}</span>
                  {s.sub && <span className="block text-xs m2-ink3 truncate">{s.sub}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
