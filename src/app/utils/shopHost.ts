// The store's own hosts. Any other host is a merchant's own domain (Domains),
// which opens that shop on its own. If the store moves, add its host to
// VITE_STORE_HOSTS (comma-separated).
const STORE_HOSTS = [
  "store.naychurrahl.com.ng",
  // Abigail's own domains (the store is moving to abigail.ng).
  "abigail.ng",
  "www.abigail.ng",
  "abigail.com.ng",
  "www.abigail.com.ng",
  "localhost",
  "127.0.0.1",
  ...String(import.meta.env.VITE_STORE_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
];

export const MAIN_STORE_URL: string = import.meta.env.VITE_STORE_URL || "https://store.naychurrahl.com.ng";

// The address a shop name gives (abigail.ng/<slug>), made the way the
// backend makes it (Functions.php slugify). Empty when the name has no
// letters or numbers.
export function storeAddress(shopName: string): string {
  const slug = shopName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `${MAIN_STORE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${slug}` : "";
}

// The merchant domain this page is on, or null on the store itself. In
// development, ?shop-host=www.example.com pretends to be on that domain
// (?shop-host= with nothing clears it).
export function shopHost(): string | null {
  let host = window.location.hostname.toLowerCase();
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    try {
      if (params.has("shop-host")) {
        const fake = params.get("shop-host")?.trim().toLowerCase();
        if (fake) sessionStorage.setItem("shop-host", fake);
        else sessionStorage.removeItem("shop-host");
      }
      host = sessionStorage.getItem("shop-host") || host;
    } catch {
      host = params.get("shop-host")?.trim().toLowerCase() || host;
    }
  }
  if (STORE_HOSTS.includes(host) || host.endsWith(".vercel.app")) return null;
  return host;
}
