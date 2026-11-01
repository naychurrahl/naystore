import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { InsightsReport, RANGES, rangeFrom, type InsightReport } from "../components/InsightsReport";

// How the shop is doing: visits, views, carts and sales, where people came
// from and where they are.
export function MerchantInsightsPage() {
  const { authHeader } = useAuth();
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<InsightReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`${API_BASE}/my-insights?from=${rangeFrom(days)}`, { headers: authHeader })
      .then((res: any) => setReport(res as InsightReport))
      .catch((err: any) => toast.error(err.message || "Couldn't load your insights"))
      .finally(() => setLoading(false));
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Insights</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            How many people visit your shop and products, what they do, and where they come from.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map(([n, label]) => (
            <button key={n} onClick={() => setDays(n)} className="px-3 py-1.5 rounded-full text-sm border"
              style={days === n
                ? { backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, #fff)", borderColor: "var(--color-primary)" }
                : { borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {report ? (
        <div style={{ opacity: loading ? 0.6 : 1 }}><InsightsReport report={report} /></div>
      ) : loading ? (
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      ) : null}
    </div>
  );
}
