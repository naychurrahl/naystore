import { useMemo } from "react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useShopMode } from "../context/ShopModeContext";
import { recentlyViewed } from "../alt/recent";
import { naira, type AltProduct } from "../alt/shared";
import { shopsOf, sponsoredAbove, useStoreHome, type HomeCategory, type HomeShop } from "./useStoreHome";

// The home page, the same in every theme: one list of rows, in order. Each
// theme draws each kind of row in its own style (alt/AltHome, alt2/Home,
// pages/Home). A row with nothing in it is left out.

export type HouseCard = { name: string; items: AltProduct[]; to: string };
export type Collection = { title: string; note: string; to: string; items: AltProduct[] };

export type HomeRow =
  | { kind: "banner"; id: "banner" }
  | { kind: "categories"; id: "categories"; title: string; items: HomeCategory[]; seeAll: string }
  | { kind: "shops"; id: "sponsored-shops" | "featured-shops"; title: string; note?: string; shops: HomeShop[]; sponsored: boolean; house?: HouseCard }
  | { kind: "products"; id: string; title: string; note?: string; products: AltProduct[]; sponsoredIds: Set<string>; seeAll?: string; loading?: boolean; band?: boolean }
  | { kind: "ranked"; id: "best"; title: string; note: string; products: AltProduct[]; sponsored: AltProduct[]; spots: number; seeAll?: string; loading?: boolean }
  | { kind: "collections"; id: "collections"; title: string; items: Collection[] }
  | { kind: "recent"; id: "recent"; title: string; products: AltProduct[] }
  | { kind: "shopAll"; id: "shop-all"; count: number; images: string[] }
  | { kind: "promises"; id: "promises" }
  | { kind: "testimonials"; id: "testimonials" };

export const SHOP_ALL = "/shop";
export const shopAllWith = (q: string) => `${SHOP_ALL}?${q}`;
const NONE = new Set<string>();

export function useHomeRows() {
  const home = useStoreHome();
  const { shop } = useShopMode();
  const { products, loading, storeName, house, sponsored, shelf, deals, topRated, categories, paidShops, featured, spots, best, bestLoading } = home;
  const { data: trendHouse, loading: trendHouseLoading } = useAPI(shop ? null : `${API_BASE}/trending?scope=house&limit=12`);
  const { data: trendAll, loading: trendAllLoading } = useAPI(shop ? null : `${API_BASE}/trending?scope=all&limit=12`);
  const { data: featuredData } = useAPI(shop ? null : `${API_BASE}/featured-shops`);

  const rows = useMemo<HomeRow[]>(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    // Trending comes from the API in order; the cards use the catalogue's
    // copy, so a shop that's gone quiet since drops out.
    const inCatalogue = (list: unknown) => ((list ?? []) as { id: string }[]).map((p) => byId.get(p.id)).filter((p): p is AltProduct => !!p && p.inStock);
    const trendingHouse = inCatalogue(trendHouse);
    const trendingAll = inCatalogue(trendAll);
    const trendingPaid = sponsoredAbove(trendingAll, sponsored, spots);
    const featuredShops = shopsOf(products, ((featuredData as { shops?: string[] } | null)?.shops ?? []).filter((s) => !paidShops.some((p) => p.slug === s)));

    const recent = recentlyViewed(products);
    const seen = new Set(recent.map((p) => p.id));
    const recentCats = new Set(recent.flatMap((p) => p.categories ?? []));
    const picked = shelf.filter((p) => !seen.has(p.id) && p.categories?.some((c) => recentCats.has(c))).slice(0, 12);
    const usePicked = picked.length >= 2;

    const collections: Collection[] = [
      { title: `Under ${naira(10000)}`, note: "Small prices, same quality", to: shopAllWith("max=10000&sort=price-low"), items: shelf.filter((p) => p.price < 10000) },
      { title: "Pay on delivery", note: "Pay when it arrives", to: shopAllWith("cod=1"), items: shelf.filter((p) => p.codEligible && p.inStock) },
      { title: "Rated 4★ and up", note: "Loved by buyers", to: shopAllWith("rating=4&sort=rating"), items: shelf.filter((p) => (p.reviewCount ?? 0) > 0 && (p.avgRating ?? 0) >= 4) },
    ].filter((c) => c.items.length >= 2);

    const useBest = bestLoading || best.length >= 3;
    const name = storeName || "our store";

    const all: (HomeRow | false)[] = [
      { kind: "banner", id: "banner" },
      (loading || categories.length > 0) && { kind: "categories", id: "categories", title: "Shop by category", items: categories, seeAll: "/categories" },
      paidShops.length > 0 && { kind: "shops", id: "sponsored-shops", title: "Sponsored shops", note: "Shops on the home page today", shops: paidShops, sponsored: true },
      (house.length > 0 || featuredShops.length > 0) && {
        kind: "shops", id: "featured-shops", title: "Featured shops", note: "Busy, well rated shops", shops: featuredShops, sponsored: false,
        house: house.length > 0 ? { name: storeName || "Our store", items: house, to: shopAllWith("house=1") } : undefined,
      },
      (trendHouseLoading || trendingHouse.length > 0) && {
        kind: "products", id: "trending-house", title: `Trending on ${name}`, note: "Our own products buyers are ordering now",
        products: trendingHouse, sponsoredIds: NONE, seeAll: shopAllWith("house=1"), loading: trendHouseLoading,
      },
      (trendAllLoading || trendingAll.length > 0) && {
        kind: "products", id: "trending-all", title: "Trending everywhere", note: "From every shop",
        products: [...trendingPaid, ...trendingAll], sponsoredIds: new Set(trendingPaid.map((p) => p.id)), seeAll: SHOP_ALL, loading: trendAllLoading,
      },
      (loading || deals.length > 0) && {
        kind: "products", id: "deals", title: "Today's deals", note: "Marked down from the seller's earlier price",
        products: deals.slice(0, 12), sponsoredIds: home.sponsoredIds, seeAll: shopAllWith("deals=1&sort=discount"), loading, band: true,
      },
      useBest
        ? { kind: "ranked", id: "best", title: "Best sellers", note: "What buyers are ordering most", products: best.slice(0, 6), sponsored, spots, loading: bestLoading }
        : (topRated.length > 0 || sponsored.length > 0) && {
          kind: "ranked", id: "best", title: "Top rated", note: "Highest scores from buyers' reviews", products: topRated.slice(0, 6), sponsored, spots, seeAll: shopAllWith("sort=rating"),
        },
      (loading || featured.length > 0 || usePicked) && (usePicked
        ? { kind: "products", id: "picked", title: "Picked for you", note: "Based on what you've looked at", products: picked, sponsoredIds: home.sponsoredIds }
        : { kind: "products", id: "picked", title: "Featured products", products: featured, sponsoredIds: home.sponsoredIds, seeAll: SHOP_ALL, loading }),
      collections.length > 0 && { kind: "collections", id: "collections", title: "Collections", items: collections },
      recent.length > 0 && { kind: "recent", id: "recent", title: "Recently viewed", products: recent },
      !loading && products.length > 0 && { kind: "shopAll", id: "shop-all", count: products.length, images: products.slice(0, 4).map((p) => p.image).filter(Boolean) as string[] },
      { kind: "promises", id: "promises" },
      { kind: "testimonials", id: "testimonials" },
    ];
    return all.filter((r): r is HomeRow => !!r);
  }, [products, loading, storeName, house, sponsored, shelf, deals, topRated, categories, paidShops, featured, spots, best, bestLoading,
    home.sponsoredIds, trendHouse, trendHouseLoading, trendAll, trendAllLoading, featuredData]);

  return { ...home, rows };
}
