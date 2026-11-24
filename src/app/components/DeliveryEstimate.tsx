import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { NIGERIA_STATE_LGAS, NIGERIA_STATES } from "../data/nigeriaStates";

type Quote = { delivers: boolean; needed: boolean; unset?: boolean; fee?: number; zone?: string; daysMin?: number; daysMax?: number; freeAbove?: number | null };

const KEY = "naychurrahl_delivery_place";
const read = (): { state: string; lga: string } | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } };
const write = (v: { state: string; lga: string }) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };
const days = (q: Quote) => (q.daysMax === 0 ? "same day" : q.daysMin === q.daysMax ? `${q.daysMax} day${q.daysMax === 1 ? "" : "s"}` : `${q.daysMin}-${q.daysMax} days`);

// What delivering this product costs where the buyer is: their saved
// address, or the place they pick here (remembered in this browser).
export function DeliveryEstimate({ productId, productType }: { productId: string; productType?: string }) {
  const { user } = useAuth();
  const saved = read();
  const [state, setState] = useState<string>((user as any)?.state || saved?.state || "");
  const [lga, setLga] = useState<string>((user as any)?.lga || saved?.lga || "");
  const [picking, setPicking] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setQuote(null);
    if (!state) return;
    let live = true;
    const q = new URLSearchParams({ productId, state, ...(lga ? { lga } : {}) });
    api.get(`${API_BASE}/delivery-quote?${q}`).then((r: Quote) => { if (live) setQuote(r); }).catch(() => {});
    return () => { live = false; };
  }, [productId, state, lga]);

  if (productType && productType !== "physical") return null;
  const place = lga ? `${lga}, ${state}` : state === "FCT" ? "Abuja" : state;

  return (
    <div className="text-sm grid gap-2" style={{ color: "var(--color-text-secondary)" }}>
      <p className="flex items-start gap-2">
        <Truck className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
        <span>
          {!state ? "Choose where to deliver to see the fee."
            : !quote ? `Delivery to ${place}: checking…`
            : !quote.delivers ? (quote.unset ? "This shop hasn't set its delivery fees yet." : `This shop doesn't deliver to ${place}.`)
            : <>Delivery to {place}: <strong style={{ color: "var(--color-text-primary)" }}>{quote.fee === 0 ? "free" : `₦${Number(quote.fee).toLocaleString()}`}</strong>, {days(quote)}
              {quote.freeAbove && quote.fee ? <> (free on orders from this shop over ₦{quote.freeAbove.toLocaleString()})</> : null}.</>}
          {" "}<button type="button" className="underline" onClick={() => setPicking(!picking)}>{state ? "Change" : "Choose place"}</button>
        </span>
      </p>
      {picking && (
        <div className="flex flex-wrap gap-2">
          <select aria-label="Deliver to state" value={state} onChange={(e) => { setState(e.target.value); setLga(""); write({ state: e.target.value, lga: "" }); }}
            className="h-9 px-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
            <option value="">State</option>
            {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {state && (
            <select aria-label="Deliver to LGA" value={lga} onChange={(e) => { setLga(e.target.value); write({ state, lga: e.target.value }); }}
              className="h-9 px-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
              <option value="">Any LGA</option>
              {(NIGERIA_STATE_LGAS[state] ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
