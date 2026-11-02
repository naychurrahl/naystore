import type { AltProduct } from "./shared";

// Products this browser opened lately (newest first), for "Recently viewed".
const KEY = "naychurrahl_alt_recent";
const MAX = 12;

function read(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberViewed(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...read().filter((x) => x !== id)].slice(0, MAX)));
  } catch {
    // Private windows can refuse storage; the rail just stays empty.
  }
}

export function recentlyViewed(products: AltProduct[], except?: string): AltProduct[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return read().filter((id) => id !== except).map((id) => byId.get(id)).filter(Boolean) as AltProduct[];
}
