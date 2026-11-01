import { useState } from "react";

// The Insights report from GET my-insights / insights. Shared in shape with
// the CMS's copy (cms/src/app/components/InsightsReport.tsx) - keep both in step.
export type Totals = { visits: number; views: number; carts: number; checkouts: number; orders: number; units: number; revenue: number };
export type InsightReport = {
  from: string;
  to: string;
  totals: Totals;
  days: ({ day: string } & Totals)[];
  sources: { source: string; count: number }[];
  states: { state: string; count: number }[];
  products: ({ id: string; name: string } & Omit<Totals, "visits">)[];
};

export const RANGES: [number, string][] = [[7, "7 days"], [30, "30 days"], [90, "90 days"], [365, "12 months"]];
// The first day of the last n days, as YYYY-MM-DD.
export const rangeFrom = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const money = (n: number) => `₦${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const num = (n: number) => Number(n ?? 0).toLocaleString();
const SOURCES: Record<string, string> = {
  direct: "Direct (typed the address, an app or a chat)", store: "Browsing Naychurrahl", referral: "Invite links",
  search: "Search engines", social: "Social media", link: "Other websites", app: "The Naychurrahl app", promo: "Your promo links",
};
const stateLabel = (s: string) => (s === "outside" ? "Outside Nigeria" : s === "unknown" ? "Unknown" : s);
const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const SERIES: { key: keyof Totals; label: string; format: (n: number) => string }[] = [
  { key: "visits", label: "Shop visits", format: num },
  { key: "views", label: "Product views", format: num },
  { key: "carts", label: "Added to cart", format: num },
  { key: "checkouts", label: "Checkouts started", format: num },
  { key: "orders", label: "Orders", format: num },
  { key: "revenue", label: "Sales", format: money },
];

const card = { backgroundColor: "var(--color-product-card, var(--color-card))", border: "1px solid var(--color-border)" };
const ink = { primary: { color: "var(--color-text-primary)" }, secondary: { color: "var(--color-text-secondary)" }, muted: { color: "var(--color-text-muted)" } };

// One series a day: bars from the baseline, the hovered day's values above.
function DailyBars({ days, series }: { days: InsightReport["days"]; series: (typeof SERIES)[number] }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = days.map((d) => Number(d[series.key]) || 0);
  const max = Math.max(...values, 0);
  const shown = hover ?? days.length - 1;
  return (
    <div>
      <p className="text-sm h-5" style={ink.secondary}>
        <span style={ink.primary} className="font-semibold">{series.format(values[shown] ?? 0)}</span> · {days[shown] ? shortDay(days[shown].day) : ""}
      </p>
      <div className="relative mt-2 h-40 flex items-end" style={{ gap: days.length > 60 ? 0 : 2, borderBottom: "1px solid var(--color-border)" }}
        onMouseLeave={() => setHover(null)}>
        {max === 0 && <span className="absolute inset-0 flex items-center justify-center text-sm" style={ink.muted}>Nothing yet in these days</span>}
        {days.map((d, i) => (
          <div key={d.day} className="flex-1 h-full flex items-end cursor-default" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}
            title={`${shortDay(d.day)}: ${series.format(values[i])}`}>
            <div className="w-full" style={{
              height: values[i] ? `${Math.max(2, (values[i] / max) * 100)}%` : 0,
              backgroundColor: "var(--color-primary)",
              opacity: hover === null || hover === i ? 1 : 0.45,
              borderRadius: days.length > 60 ? "1px 1px 0 0" : "4px 4px 0 0",
            }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs mt-1" style={ink.muted}>
        <span>{days[0] && shortDay(days[0].day)}</span>
        <span>{days.length > 0 && shortDay(days[days.length - 1].day)}</span>
      </div>
    </div>
  );
}

function BarList({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(...rows.map((r) => r.count), 0);
  if (!rows.length) return <p className="text-sm" style={ink.muted}>{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span style={ink.secondary}>{r.label}</span>
            <span className="font-medium tabular-nums" style={ink.primary}>{num(r.count)}</span>
          </div>
          <div className="h-1.5 mt-1 rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, backgroundColor: "var(--color-primary)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Tiles (each picks the daily chart's series), the daily chart, sources,
// states and products.
export function InsightsReport({ report }: { report: InsightReport }) {
  const [seriesKey, setSeriesKey] = useState<keyof Totals>("views");
  const series = SERIES.find((s) => s.key === seriesKey)!;
  const t = report.totals;
  const people = t.visits + t.views;
  const topStates = report.states.slice(0, 10);
  const otherStates = report.states.slice(10).reduce((n, s) => n + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SERIES.map((s) => (
          <button key={s.key} onClick={() => setSeriesKey(s.key)} className="p-4 rounded-xl text-left transition-shadow"
            style={{ ...card, ...(s.key === seriesKey ? { borderColor: "var(--color-primary)", boxShadow: "0 0 0 1px var(--color-primary)" } : {}) }}>
            <p className="text-xs" style={ink.secondary}>{s.label}</p>
            <p className="text-xl font-bold mt-1 tabular-nums" style={ink.primary}>{s.format(t[s.key])}</p>
          </button>
        ))}
      </div>

      <div className="p-5 rounded-xl" style={card}>
        <h2 className="font-semibold" style={ink.primary}>{series.label} by day</h2>
        <DailyBars days={report.days} series={series} />
        {people > 0 && (
          <p className="text-xs mt-3" style={ink.muted}>
            {t.orders > 0 ? `About 1 order for every ${num(Math.max(1, Math.round(people / t.orders)))} visits and views. ` : ""}
            Each person counts once a day per shop or product.
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl" style={card}>
          <h2 className="font-semibold mb-1" style={ink.primary}>Where people came from</h2>
          <p className="text-xs mb-4" style={ink.muted}>Shop visits and product views</p>
          <BarList rows={report.sources.map((s) => ({ label: SOURCES[s.source] ?? s.source, count: s.count }))} empty="No visits yet." />
        </div>
        <div className="p-5 rounded-xl" style={card}>
          <h2 className="font-semibold mb-1" style={ink.primary}>Where they are</h2>
          <p className="text-xs mb-4" style={ink.muted}>By state, from their internet connection - mobile networks often show as Lagos or Abuja.</p>
          <BarList rows={[...topStates.map((s) => ({ label: stateLabel(s.state), count: s.count })), ...(otherStates ? [{ label: "Other states", count: otherStates }] : [])]}
            empty="No visits yet." />
          <p className="text-xs mt-4" style={ink.muted}>
            <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline">IP geolocation by DB-IP</a>
          </p>
        </div>
      </div>

      <div className="p-5 rounded-xl" style={card}>
        <h2 className="font-semibold mb-4" style={ink.primary}>Products</h2>
        {report.products.length === 0 ? (
          <p className="text-sm" style={ink.muted}>No product views or sales in these days.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={ink.secondary}>
                  <th className="font-medium pb-2 pr-4">Product</th>
                  <th className="font-medium pb-2 px-2 text-right">Views</th>
                  <th className="font-medium pb-2 px-2 text-right">Carts</th>
                  <th className="font-medium pb-2 px-2 text-right">Checkouts</th>
                  <th className="font-medium pb-2 px-2 text-right">Sold</th>
                  <th className="font-medium pb-2 pl-2 text-right">Sales</th>
                </tr>
              </thead>
              <tbody>
                {report.products.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td className="py-2 pr-4" style={ink.primary}>{p.name}</td>
                    <td className="py-2 px-2 text-right tabular-nums" style={ink.secondary}>{num(p.views)}</td>
                    <td className="py-2 px-2 text-right tabular-nums" style={ink.secondary}>{num(p.carts)}</td>
                    <td className="py-2 px-2 text-right tabular-nums" style={ink.secondary}>{num(p.checkouts)}</td>
                    <td className="py-2 px-2 text-right tabular-nums" style={ink.secondary}>{num(p.units)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums" style={ink.primary}>{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
