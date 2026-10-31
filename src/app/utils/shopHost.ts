// The store's own hosts. Any other host is a merchant's own domain (Domains),
// which opens that shop on its own. If the store moves, add its host to
// VITE_STORE_HOSTS (comma-separated).
const STORE_HOSTS = [
  "store.naychurrahl.com.ng",
  "localhost",
  "127.0.0.1",
  ...String(import.meta.env.VITE_STORE_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
];

export const MAIN_STORE_URL: string = import.meta.env.VITE_STORE_URL || "https://store.naychurrahl.com.ng";

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
