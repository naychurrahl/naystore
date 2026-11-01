import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Trash2, Check, X } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { MAIN_STORE_URL } from "../utils/shopHost";
import { RANGES, rangeFrom, money, type InsightReport } from "../components/InsightsReport";

type Promo = { id: string; name: string; code: string; createdAt: string; visits: number; views: number; carts: number; checkouts: number; orders: number; units: number; revenue: number };
type Product = { id: string; name: string };

const card = { backgroundColor: "var(--color-product-card, var(--color-card))", border: "1px solid var(--color-border)" };
const ink = { primary: { color: "var(--color-text-primary)" }, secondary: { color: "var(--color-text-secondary)" }, muted: { color: "var(--color-text-muted)" } };

// Promo links: a tag (?promo=CODE) on the shop's own links, one per post, ad
// or flyer, so Insights shows what each brought in.
export function MerchantPromoLinksPage() {
  const { authHeader } = useAuth();
  const [days, setDays] = useState(30);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [target, setTarget] = useState(""); // "" = the shop page, else a product id
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const load = () => {
    setLoading(true);
    return api.get(`${API_BASE}/my-insights?from=${rangeFrom(days)}`, { headers: authHeader })
      .then((res: any) => setPromos(((res as InsightReport & { promos?: Promo[] }).promos ?? [])))
      .catch((err: any) => toast.error(err.message || "Couldn't load your promo links"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { void load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  // Links go to the shop's own domain when it has one, else its store page.
  useEffect(() => {
    Promise.all([
      api.get(`${API_BASE}/my-shop`, { headers: authHeader }).catch(() => null),
      api.get(`${API_BASE}/my-domains`, { headers: authHeader }).catch(() => null),
      api.get(`${API_BASE}/my-products`, { headers: authHeader }).catch(() => []),
    ]).then(([shop, domains, mine]: any[]) => {
      const own = domains?.domain?.status === "active" ? `https://${domains.domain.domain}` : "";
      setBase(own || (shop?.slug ? `${MAIN_STORE_URL}/sellers/${shop.slug}` : ""));
      setProducts(((mine ?? []) as any[]).map((p) => ({ id: p.id, name: p.name })));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ownDomain = base !== "" && !base.startsWith(MAIN_STORE_URL);
  const linkFor = (code: string) => {
    if (!base) return `?promo=${code}`;
    const page = target === "" ? base : ownDomain ? `${base}/shop/${target}` : `${MAIN_STORE_URL}/shop/${target}`;
    return `${page}?promo=${code}`;
  };
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(linkFor(code));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy - select the link and copy it");
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post(`${API_BASE}/promo-links`, { name }, { headers: authHeader });
      setName("");
      toast.success("Promo link made");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Couldn't make the link");
    } finally {
      setSaving(false);
    }
  };
  const rename = async () => {
    if (!editing?.name.trim()) return;
    try {
      await api.put(`${API_BASE}/promo-links/${editing.id}`, { name: editing.name }, { headers: authHeader });
      setEditing(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Couldn't rename the link");
    }
  };
  const remove = async (p: Promo) => {
    if (!window.confirm(`Delete "${p.name}"? Links already shared with this code stop being tracked. Its past visits stay in Insights under promo links.`)) return;
    try {
      await api.delete(`${API_BASE}/promo-links/${p.id}`, { headers: authHeader });
      await load();
    } catch (err: any) {
      toast.error(err.message || "Couldn't delete the link");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={ink.primary}>Promo links</h1>
        <p className="text-sm mt-1" style={ink.secondary}>
          Make a link for each post, ad or flyer - "Instagram bio", "November flyer" - and see how many people each one brings, and what they buy.
          A promo link is your normal link with a tag on the end, so it works on your shop and on any of your products.
        </p>
      </div>

      <form onSubmit={create} className="p-5 rounded-xl flex flex-wrap items-end gap-3" style={card}>
        <label className="flex-1 min-w-[220px] text-sm space-y-1">
          <span style={ink.secondary}>Name it after where you'll share it</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Instagram bio"
            className="w-full h-10 px-3 rounded-lg border bg-transparent" style={{ borderColor: "var(--color-border)", ...ink.primary }} />
        </label>
        <button disabled={saving || !name.trim()} className="h-10 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, #fff)" }}>
          {saving ? "Making…" : "Make link"}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm flex items-center gap-2">
          <span style={ink.secondary}>Links open</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 px-2 rounded-lg border bg-transparent max-w-[260px]"
            style={{ borderColor: "var(--color-border)", ...ink.primary }}>
            <option value="">your shop page</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {RANGES.map(([n, label]) => (
            <button key={n} onClick={() => setDays(n)} className="px-3 py-1.5 rounded-full text-sm border"
              style={days === n
                ? { backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, #fff)", borderColor: "var(--color-primary)" }
                : { borderColor: "var(--color-border)", ...ink.secondary }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loading && promos.length === 0 ? (
        <div className="p-5 rounded-xl text-sm" style={{ ...card, ...ink.secondary }}>No promo links yet - make your first one above.</div>
      ) : (
        <div className="space-y-3" style={{ opacity: loading ? 0.6 : 1 }}>
          {promos.map((p) => (
            <div key={p.id} className="p-4 rounded-xl" style={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editing?.id === p.id ? (
                    <div className="flex items-center gap-2">
                      <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={80} autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") void rename(); if (e.key === "Escape") setEditing(null); }}
                        className="h-9 px-2 rounded-lg border bg-transparent flex-1" style={{ borderColor: "var(--color-border)", ...ink.primary }} />
                      <button onClick={() => void rename()} aria-label="Save name" className="p-2" style={ink.secondary}><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditing(null)} aria-label="Cancel" className="p-2" style={ink.secondary}><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <p className="font-semibold" style={ink.primary}>{p.name}</p>
                  )}
                  <p className="text-xs mt-1 font-mono break-all" style={ink.muted}>{linkFor(p.code)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => void copy(p.code)} className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
                    style={{ borderColor: "var(--color-border)", ...ink.primary }}>
                    <Copy className="h-4 w-4" /> Copy
                  </button>
                  <button onClick={() => setEditing({ id: p.id, name: p.name })} aria-label="Rename" className="p-2" style={ink.secondary}><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => void remove(p)} aria-label="Delete" className="p-2" style={{ color: "var(--color-error)" }}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 text-sm">
                {([["Shop visits", p.visits], ["Product views", p.views], ["Carts", p.carts], ["Checkouts", p.checkouts], ["Orders", p.orders], ["Sales", money(p.revenue)]] as [string, number | string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs" style={ink.muted}>{label}</p>
                    <p className="font-semibold tabular-nums" style={ink.primary}>{typeof value === "number" ? value.toLocaleString() : value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs" style={ink.muted}>
        Each person counts once a day. Orders count when they're placed in the same visit as the click. You can also add <code>?promo=CODE</code> to any link of yours by hand.
      </p>
    </div>
  );
}
