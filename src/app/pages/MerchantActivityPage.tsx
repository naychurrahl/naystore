import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

type Entry = {
  id: string;
  at: string;
  action: string;
  actor: { kind: string; name: string | null };
  subject: { type: string; id: string | null; label: string | null };
  details: Record<string, any> | null;
};

const AREAS: [string, string][] = [
  ["", "All"], ["order", "Orders"], ["delivery", "Deliveries"], ["product", "Products"],
  ["payout", "Payouts"], ["commission", "Commissions"], ["account", "Account"],
];

// Plain words for each kind of entry, as the shop owner sees it.
const ACTIONS: Record<string, string> = {
  "order.placed": "New order", "order.status": "Order status changed", "order.payment_status": "Payment",
  "order.refund_status": "Refund", "delivery.status": "Delivery updated", "commission.recorded": "Sale recorded",
  "commission.payout_status": "Earnings payout", "commission.held": "Earnings hold", "payout.started": "Payout sent",
  "payout.status": "Payout", "product.created": "Product added", "product.updated": "Product changed",
  "product.deleted": "Product deleted", "account.created": "Account created", "account.changed": "Account details changed",
  "account.login": "Logged in", "account.login_failed": "Failed login attempt", "account.password_reset": "Password reset",
  "commission_terms.changed": "Commission terms changed", "payout_settings.created": "Payout details added",
  "payout_settings.method": "Payout method changed", "payout_settings.account_number": "Bank account changed",
  "coupon.created": "Coupon created", "coupon.active": "Coupon switched", "report.opened": "Problem reported",
  "report.status": "Problem report updated", "domain.added": "Domain added", "domain.status": "Domain", "reward.status": "Referral reward",
};
const WHO: Record<string, string> = { guest: "A customer", cron: "Automatic", paystack: "Paystack", naylet: "Naylet" };

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "none" : String(v).replace(/_/g, " "));
function change(c: Record<string, any>) {
  if (c.changed) return "changed";
  return "from" in c ? `${show(c.from)} → ${show(c.to)}` : show(c.to);
}
function describe(d: Entry["details"]) {
  if (!d) return "";
  if ("from" in d || "to" in d || "changed" in d) return change(d);
  return Object.entries(d)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v && typeof v === "object" ? change(v) : show(v)}`)
    .join(" · ");
}
const dayOf = (at: string) => new Date(at.replace(" ", "T")).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeOf = (at: string) => new Date(at.replace(" ", "T")).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// Everything that happened in the shop: orders, deliveries, money, products, the account.
export function MerchantActivityPage() {
  const { authHeader } = useAuth();
  const [area, setArea] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (nextArea: string, nextPage: number) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(nextPage), ...(nextArea ? { area: nextArea } : {}) });
    try {
      const res = (await api.get(`${API_BASE}/my-activity?${q}`, { headers: authHeader })) as { entries: Entry[]; hasMore: boolean };
      setEntries((prev) => (nextPage === 1 ? res.entries : [...prev, ...res.entries]));
      setHasMore(res.hasMore);
      setPage(nextPage);
    } catch (err: any) {
      toast.error(err.message || "Couldn't load your activity");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(area, 1); }, [area]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = { backgroundColor: "var(--color-product-card)", border: "1px solid var(--color-border)" };
  const days: [string, Entry[]][] = [];
  for (const e of entries) {
    const d = dayOf(e.at);
    if (!days.length || days[days.length - 1][0] !== d) days.push([d, []]);
    days[days.length - 1][1].push(e);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Activity</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          A permanent record of what happened in your shop - orders, deliveries, payouts, product changes and your account.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {AREAS.map(([value, label]) => (
          <button key={value} onClick={() => setArea(value)} className="px-3 py-1.5 rounded-full text-sm border"
            style={area === value
              ? { backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, #fff)", borderColor: "var(--color-primary)" }
              : { borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {label}
          </button>
        ))}
      </div>

      {!loading && entries.length === 0 && (
        <div className="p-5 rounded-xl text-sm" style={{ ...card, color: "var(--color-text-secondary)" }}>Nothing here yet.</div>
      )}

      {days.map(([day, list]) => (
        <div key={day}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>{day}</h2>
          <div className="rounded-xl divide-y" style={card}>
            {list.map((e) => (
              <div key={e.id} className="p-4 flex gap-4">
                <span className="text-xs w-16 shrink-0 pt-0.5" style={{ color: "var(--color-text-muted)" }}>{timeOf(e.at)}</span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {ACTIONS[e.action] ?? e.action}
                    {(e.subject.label || (e.subject.id && e.subject.type !== "user")) && (
                      <span className="font-normal" style={{ color: "var(--color-text-secondary)" }}> · {e.subject.label ?? e.subject.id}</span>
                    )}
                  </p>
                  {describe(e.details) && <p className="break-words" style={{ color: "var(--color-text-secondary)" }}>{describe(e.details)}</p>}
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{e.actor.name ?? WHO[e.actor.kind] ?? e.actor.kind}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <button disabled={loading} onClick={() => void load(area, page + 1)} className="px-4 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
