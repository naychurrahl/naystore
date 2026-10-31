import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Store } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { MAIN_STORE_URL, shopHost } from "../utils/shopHost";

export type ShopInfo = { domain: string; slug: string; name: string; bio: string | null; bannerImage: string | null };

// On a merchant's own domain the app runs in "shop mode": only that shop,
// under its name (see Layout and the index route).
const ShopModeContext = createContext<{ shop: ShopInfo | null }>({ shop: null });

export const useShopMode = () => useContext(ShopModeContext);

function ShopUnavailable() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="text-center max-w-sm">
        <Store className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>This shop isn't available</h1>
        <p className="mb-5" style={{ color: "var(--color-text-secondary)" }}>The address may be new or no longer in use.</p>
        <a href={MAIN_STORE_URL} className="font-medium hover:underline" style={{ color: "var(--color-primary)" }}>Visit the store</a>
      </div>
    </div>
  );
}

// Works out which shop a merchant domain opens before anything renders, so
// a shop's own domain never flashes the marketplace.
export function ShopModeGate({ children }: { children: ReactNode }) {
  const host = useMemo(shopHost, []);
  const [state, setState] = useState<{ status: "loading" | "ready" | "unavailable"; shop: ShopInfo | null }>(
    host ? { status: "loading", shop: null } : { status: "ready", shop: null }
  );

  useEffect(() => {
    if (!host) return;
    api.get(`${API_BASE}/domains/resolve?host=${encodeURIComponent(host)}`)
      .then((shop: ShopInfo) => setState({ status: "ready", shop }))
      .catch(() => setState({ status: "unavailable", shop: null }));
  }, [host]);

  useEffect(() => {
    if (state.shop) document.title = state.shop.name;
  }, [state.shop]);

  if (state.status === "loading") {
    return <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }} />;
  }
  if (state.status === "unavailable") return <ShopUnavailable />;
  return <ShopModeContext.Provider value={{ shop: state.shop }}>{children}</ShopModeContext.Provider>;
}
