import { useSyncExternalStore } from "react";

// Things /alt_2 keeps in this browser only: the wishlist (there's no account
// wishlist in the API yet), the state the buyer shops from, recent searches.
// Every read and write survives storage being blocked (private windows).

function makeStore<T>(key: string, fallback: T, valid: (v: unknown) => boolean) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? "null");
      cache = valid(raw) ? (raw as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  };
  const write = (value: T) => {
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Kept for this visit only.
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) { cache = undefined; l(); }
    };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
  };
  const use = () => useSyncExternalStore(subscribe, read, () => fallback);
  return { read, write, use };
}

const isStringList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");

const wishlist = makeStore<string[]>("naychurrahl_m2_wishlist", [], isStringList);
export const useWishlist = wishlist.use;
export function toggleWishlist(id: string): boolean {
  const now = wishlist.read();
  const on = !now.includes(id);
  wishlist.write(on ? [id, ...now] : now.filter((x) => x !== id));
  return on;
}
export const inWishlist = (id: string) => wishlist.read().includes(id);
export const removeFromWishlist = (id: string) => wishlist.write(wishlist.read().filter((x) => x !== id));

const shopState = makeStore<string>("naychurrahl_m2_state", "", (v) => typeof v === "string");
export const useShopState = shopState.use;
export const setShopState = (state: string) => shopState.write(state);

const searches = makeStore<string[]>("naychurrahl_m2_searches", [], isStringList);
export const useRecentSearches = searches.use;
export function rememberSearch(q: string) {
  const term = q.trim();
  if (!term) return;
  searches.write([term, ...searches.read().filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 6));
}
export const clearSearches = () => searches.write([]);
