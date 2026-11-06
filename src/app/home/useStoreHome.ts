import { useEffect, useMemo, useState } from "react";
import { apiFetch, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useShopMode } from "../context/ShopModeContext";
import { saving, useCatalog, type AltProduct } from "../alt/shared";

// The home page is the store's own: its products (those with no merchant),
// shared with shops that paid for a place today. Every theme's home page gets
// its sections from here, so a paying shop shows up whichever theme a buyer uses.

// `spots`: how many of a section's first places are sponsored (set in the CMS).
export type HomePromotions = { spots: number; shops: string[]; products: string[]; categories: Record<string, string[]> };

const NONE: HomePromotions = { spots: 0, shops: [], products: [], categories: {} };
const NOTHING = new Set<string>();
let promotions: Promise<HomePromotions> | null = null;

// Fetched once per visit. If it fails the page is simply all the store's own.
function loadPromotions(): Promise<HomePromotions> {
  if (!promotions) {
    promotions = apiFetch(`${API_BASE}/home-promotions`)
      .then((p: any) => ({ spots: p?.spots ?? 0, shops: p?.shops ?? [], products: p?.products ?? [], categories: p?.categories ?? {} }))
      .catch(() => {
        promotions = null;
        return NONE;
      });
  }
  return promotions as Promise<HomePromotions>;
}

// Today's promotions. None on a merchant's own domain: that's their shop alone.
export function useHomePromotions(): HomePromotions {
  const { shop } = useShopMode();
  const [state, setState] = useState<HomePromotions>(NONE);
  useEffect(() => {
    if (shop) return;
    let live = true;
    void loadPromotions().then((p) => { if (live) setState(p); });
    return () => { live = false; };
  }, [shop]);
  return state;
}

export const isHouse = (p: AltProduct) => !p.merchantId;

// The default browsing order: what's placed in this category, then the store's
// own, then promoted products, then other shops, each keeping its own order.
export function storeFirst<T extends AltProduct>(products: T[], promos: HomePromotions, category?: string | null): T[] {
  const pinned = new Set(category ? promos.categories[category] ?? [] : []);
  const promoted = new Set(promos.products);
  const rank = (p: T) => (pinned.has(p.id) ? 0 : isHouse(p) ? 1 : promoted.has(p.id) ? 2 : 3);
  return products.map((p, i) => [p, i] as const).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([p]) => p);
}

// What storeFirst moved up because it was paid for, so it can say "Sponsored".
export function sponsoredFor(promos: HomePromotions, category?: string | null): Set<string> {
  return new Set([...promos.products, ...(category ? promos.categories[category] ?? [] : [])]);
}

// A home section: the first places are sponsored, and any more paid for than
// that sit among the rest, one after every three.
export function sponsoredFirst<T extends { id: string }>(rest: T[], paid: T[], spots: number): T[] {
  const paidIds = new Set(paid.map((p) => p.id));
  const out: T[] = paid.slice(0, spots);
  const extra = paid.slice(spots);
  rest.filter((p) => !paidIds.has(p.id)).forEach((p, i) => {
    out.push(p);
    if (i % 3 === 2 && extra.length) out.push(extra.shift()!);
  });
  return [...out, ...extra];
}

// A ranking's sponsored first places. Something that earned its place in the
// ranking stays there, so the ranking's order stays real.
export function sponsoredAbove<T extends { id: string }>(ranked: T[], paid: T[], spots: number): T[] {
  const rankedIds = new Set(ranked.map((p) => p.id));
  return paid.filter((p) => !rankedIds.has(p.id)).slice(0, spots);
}

export type HomeShop = { slug: string; name: string; items: AltProduct[] };
export type HomeCategory = { name: string; count: number; image: string; sponsored: boolean };

const FEATURED_COUNT = 8;
const MIN_HOUSE_IN_FEATURED = 4;

export function useStoreHome() {
  const { shop } = useShopMode();
  const { products, loading, error } = useCatalog();
  const promos = useHomePromotions();
  const { spots } = promos;
  const { data: settings } = useAPI(`${API_BASE}/settings`);
  const { data: bestData, loading: bestLoading } = useAPI(`${API_BASE}/best-sellers?${shop ? "" : "house=1&"}limit=12`);

  return useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const live = (ids: string[]) => ids.map((id) => byId.get(id)).filter((p): p is AltProduct => !!p && p.inStock);

    // On a merchant's own domain the catalogue is theirs, and there's nothing to mix in.
    const house = shop ? products : products.filter(isHouse);
    const sponsored = shop ? [] : live(promos.products);
    const sponsoredIds = shop ? NOTHING : new Set(sponsored.map((p) => p.id));
    const shelf = [...house, ...sponsored];

    const byDiscount = (a: AltProduct, b: AltProduct) => saving(b)!.percent - saving(a)!.percent;
    const onSale = (p: AltProduct) => !!saving(p) && p.inStock;
    const deals = sponsoredFirst(house.filter(onSale).sort(byDiscount), sponsored.filter(onSale), spots);
    const allDeals = products.filter(onSale).sort(byDiscount);
    const topRated = house.filter((p) => (p.reviewCount ?? 0) > 0)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));

    // A category shows when the store or a paying shop has something in it.
    // Its count is the whole category, which is what its link opens.
    const counts = new Map<string, number>();
    products.forEach((p) => p.categories?.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1)));
    const pictures = new Map<string, { image: string; sponsored: boolean }>();
    if (!shop) {
      for (const [name, ids] of Object.entries(promos.categories)) {
        const paid = live(ids)[0];
        if (paid) pictures.set(name, { image: paid.image, sponsored: true });
      }
    }
    shelf.forEach((p) => p.categories?.forEach((c) => {
      if (!pictures.has(c)) pictures.set(c, { image: p.image, sponsored: false });
    }));
    const byCount: HomeCategory[] = [...pictures]
      .map(([name, pic]) => ({ name, count: counts.get(name) ?? 0, ...pic }))
      .sort((a, b) => b.count - a.count);
    const firstCategories = byCount.filter((c) => c.sponsored).slice(0, spots);
    const categories = [...firstCategories, ...byCount.filter((c) => !firstCategories.includes(c))];

    // Only shops that paid for today. The first spots are theirs, then the
    // store's own card, then any more that paid.
    const paidShops: HomeShop[] = shop ? [] : promos.shops.flatMap((slug) => {
      const items = products.filter((p) => p.merchantSlug === slug);
      return items.length ? [{ slug, name: items[0].merchantName ?? "", items }] : [];
    });
    const firstShops = paidShops.slice(0, spots);
    const laterShops = paidShops.slice(spots);

    const roomForHouse = Math.max(MIN_HOUSE_IN_FEATURED, FEATURED_COUNT - sponsored.length);
    const featured = sponsoredFirst(house.slice(0, roomForHouse), sponsored, spots);

    // "Picked for you" chooses from these; ones sold out don't belong in it.
    return {
      products, loading, error, settings,
      storeName: (settings?.companyName as string | undefined) ?? "",
      house, sponsored, sponsoredIds, shelf, deals, allDeals, topRated, categories, paidShops, firstShops, laterShops, featured, spots,
      best: (bestData ?? []) as AltProduct[], bestLoading,
    };
  }, [products, loading, error, settings, promos, spots, bestData, bestLoading, shop]);
}
