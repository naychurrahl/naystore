import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, Globe, RefreshCw } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

type DnsRecord = { type: string; name: string; value: string };
type Domain = {
  id: string;
  domain: string;
  mode: "managed" | "self";
  status: "pending" | "active" | "failed" | "expired";
  records: DnsRecord[];
  error: string | null;
  lastCheckedAt: string | null;
  isRoot: boolean;
};
type DomainData = { domain: Domain | null; enabled: boolean; managedAvailable: boolean; storeHost: string };

const STATUS: Record<Domain["status"], { label: string; color: string }> = {
  pending: { label: "Waiting for your DNS", color: "var(--color-accent)" },
  active: { label: "Live", color: "var(--color-success)" },
  failed: { label: "Not working", color: "var(--color-error)" },
  expired: { label: "Expired", color: "var(--color-text-muted)" },
};
const when = (value: string) => new Date(value.replace(" ", "T")).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// A shop's own domain (e.g. www.yourshop.com) opens just this shop.
export function MerchantDomainPage() {
  const { authHeader } = useAuth();
  const { data, loading, refetch } = useAPI(`${API_BASE}/my-domains`, { headers: authHeader });
  const info = data as DomainData | null;
  const [domain, setDomain] = useState("");
  const [mode, setMode] = useState<"managed" | "self" | null>(null);
  const [busy, setBusy] = useState(false);

  const card = { backgroundColor: "var(--color-product-card)", border: "1px solid var(--color-border)" };
  const chosenMode = mode ?? (info?.managedAvailable ? "managed" : "self");

  const run = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await work();
      if (done) toast.success(done);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy - select it and copy it yourself");
    }
  };

  if (loading && !info) return <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>;
  if (!info) return <p style={{ color: "var(--color-error)" }}>Couldn't load your domain.</p>;
  const current = info.domain;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Domain</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Use your own web address. It opens your shop on its own - your name, your products, and checkout right there. Connecting a domain you own is free.
        </p>
      </div>

      {!current && !info.enabled && (
        <div className="p-5 rounded-xl text-sm" style={{ ...card, color: "var(--color-text-secondary)" }}>Connecting domains is switched off right now.</div>
      )}

      {!current && info.enabled && (
        <div className="p-5 rounded-xl space-y-4" style={card}>
          <label className="block">
            <span className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Your domain</span>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="www.yourshop.com"
              className="w-full px-4 py-3 rounded-lg border" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
          </label>

          <div className="space-y-2">
            {([
              ["managed", "Let us handle it (recommended)", "You add one record at your domain provider; we set up the secure (https) connection and keep it running.", !info.managedAvailable],
              ["self", "I'll manage it myself", "For people who already run their domain through Cloudflare, a proxy or their own server: you forward it to our store and take care of https.", false],
            ] as const).map(([value, title, text, disabled]) => (
              <label key={value} className={`flex gap-3 p-3 rounded-lg border ${disabled ? "opacity-50" : "cursor-pointer"}`}
                style={{ borderColor: chosenMode === value ? "var(--color-primary)" : "var(--color-border)" }}>
                <input type="radio" name="mode" checked={chosenMode === value} disabled={disabled} onChange={() => setMode(value)} className="mt-1" />
                <span>
                  <span className="block font-medium" style={{ color: "var(--color-text-primary)" }}>{title}</span>
                  <span className="block text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {disabled ? "Not available yet - choose the other option for now." : text}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <button disabled={busy || !domain.trim()} className="px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            onClick={() => run(() => api.post(`${API_BASE}/my-domains`, { domain, mode: chosenMode }, { headers: authHeader }), "Domain added - now add the records below")}>
            {busy ? "Connecting…" : "Connect domain"}
          </button>
        </div>
      )}

      {current && (
        <div className="p-5 rounded-xl space-y-5" style={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="h-5 w-5 shrink-0" style={{ color: "var(--color-primary)" }} />
              <span className="font-semibold break-all" style={{ color: "var(--color-text-primary)" }}>{current.domain}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: STATUS[current.status].color, border: `1px solid ${STATUS[current.status].color}` }}>
                {STATUS[current.status].label}
              </span>
            </div>
            {current.status === "active" && (
              <a href={`https://${current.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                Open <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          {current.status === "active" ? (
            <p className="text-sm flex items-center gap-2" style={{ color: "var(--color-success)" }}>
              <CheckCircle2 className="h-4 w-4" /> {current.domain} opens your shop.
            </p>
          ) : (
            <>
              <div className="text-sm space-y-2" style={{ color: "var(--color-text-secondary)" }}>
                {current.mode === "managed" ? (
                  <p>At the company you bought the domain from (its DNS settings), add {current.records.length > 1 ? "these records" : "this record"}. The secure connection is set up for you once it's in place. DNS changes can take a few hours.</p>
                ) : (
                  <>
                    <p><strong>1.</strong> Add this TXT record at your DNS provider - it shows the domain is yours.</p>
                    <p><strong>2.</strong> Forward <strong>{current.domain}</strong> to <strong>https://{info.storeHost}</strong> as a proxy, not a redirect: the address bar must keep showing your domain, and requests must reach us with the host <strong>{info.storeHost}</strong>. Serve it over https. With your own Cloudflare, proxy the domain and use a Worker or origin rule for this.</p>
                  </>
                )}
                {current.mode === "managed" && current.isRoot && (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {current.domain} has no "www.", so your DNS provider must allow a CNAME on the root of the domain (Cloudflare calls it CNAME flattening; others call it ALIAS or ANAME). If yours doesn't, remove this and connect www.{current.domain} instead, then forward {current.domain} to it.
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--color-text-muted)" }}>
                      <th className="text-left font-medium py-1 pr-3">Type</th>
                      <th className="text-left font-medium py-1 pr-3">Name</th>
                      <th className="text-left font-medium py-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.records.map((record, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}>
                        <td className="py-2 pr-3 font-mono">{record.type}</td>
                        <td className="py-2 pr-3 font-mono break-all">
                          {record.name} <button onClick={() => copy(record.name)} aria-label="Copy name"><Copy className="inline h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} /></button>
                        </td>
                        <td className="py-2 font-mono break-all">
                          {record.value} <button onClick={() => copy(record.value)} aria-label="Copy value"><Copy className="inline h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {current.error && current.status !== "active" && (
            <p className="text-sm" style={{ color: current.status === "failed" ? "var(--color-error)" : "var(--color-text-secondary)" }}>{current.error}</p>
          )}
          {current.lastCheckedAt && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Last checked {when(current.lastCheckedAt)}. We check again every hour.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
              style={{ border: "1px solid var(--color-primary)", color: "var(--color-primary)" }}
              onClick={() => run(() => api.post(`${API_BASE}/my-domains/${current.id}/check`, {}, { headers: authHeader }))}>
              <RefreshCw className="h-4 w-4" /> Check now
            </button>
            <button disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              onClick={() => confirm(`Remove ${current.domain}? It will stop opening your shop.`)
                && run(() => api.delete(`${API_BASE}/my-domains/${current.id}`, { headers: authHeader }), "Domain removed")}>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
