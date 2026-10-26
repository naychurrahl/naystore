import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Pencil, Plus, Power, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface Coupon {
  id: string;
  code: string;
  merchantId: string | null;
  merchantName: string | null;
  kind: "percent" | "fixed";
  value: number;
  label: string;
  maxDiscount: number | null;
  minSubtotal: number | null;
  appliesTo: "all" | "products";
  productIds: string[];
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  firstOrderOnly: boolean;
  active: boolean;
  uses: number;
  discountGiven: number;
}

interface Redemption {
  orderId: string;
  email: string;
  amount: number;
  orderStatus: string;
  counts: boolean;
  createdAt: string;
}

type Form = {
  code: string;
  kind: "percent" | "fixed";
  value: string;
  maxDiscount: string;
  minSubtotal: string;
  appliesTo: "all" | "products";
  productIds: string[];
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  firstOrderOnly: boolean;
  active: boolean;
};

const EMPTY: Form = {
  code: "", kind: "percent", value: "", maxDiscount: "", minSubtotal: "",
  appliesTo: "all", productIds: [], startsAt: "", endsAt: "",
  usageLimit: "", perCustomerLimit: "1", firstOrderOnly: false, active: true,
};

const naira = (n: number) => `₦${n.toLocaleString()}`;
const str = (n: number | null) => (n === null ? "" : String(n));

// Coupon dates are Lagos wall-clock time, like the "2026-11-01T18:00" a
// datetime-local input gives.
function lagosNow(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function statusOf(c: Coupon): { label: string; color: string } {
  const now = lagosNow();
  if (!c.active) return { label: "Off", color: "var(--color-text-muted)" };
  if (c.endsAt && now >= c.endsAt) return { label: "Expired", color: "var(--color-text-muted)" };
  if (c.startsAt && now < c.startsAt) return { label: "Scheduled", color: "var(--color-accent)" };
  if (c.usageLimit !== null && c.uses >= c.usageLimit) return { label: "Used up", color: "var(--color-text-muted)" };
  return { label: "Active", color: "var(--color-success)" };
}

const when = (local: string) => new Date(local).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

// Coupons for a merchant's own products (paid from their share), or - with
// `platform` - admin's store-wide coupons (paid by the platform) alongside
// every merchant's, which admin can only switch on or off.
export function CouponManager({ productsEndpoint, platform = false }: { productsEndpoint: string; platform?: boolean }) {
  const { authHeader } = useAuth();
  const opts = { headers: authHeader };
  const { data, refetch } = useAPI(`${API_BASE}/coupons`, opts);
  const { data: productData } = useAPI(`${API_BASE}${productsEndpoint}`, opts);
  const coupons = (data ?? []) as Coupon[];
  const products = ((productData ?? []) as { id: string; name: string; merchantName?: string | null }[]);
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [usesOf, setUsesOf] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const set = (patch: Partial<Form>) => setForm((prev) => ({ ...prev, ...patch }));

  const startNew = () => {
    setForm(EMPTY);
    setEditing("new");
    setError(null);
  };
  const startEdit = (c: Coupon) => {
    setForm({
      code: c.code, kind: c.kind, value: String(c.value), maxDiscount: str(c.maxDiscount), minSubtotal: str(c.minSubtotal),
      appliesTo: c.appliesTo, productIds: c.productIds, startsAt: c.startsAt, endsAt: c.endsAt,
      usageLimit: str(c.usageLimit), perCustomerLimit: str(c.perCustomerLimit), firstOrderOnly: c.firstOrderOnly, active: c.active,
    });
    setEditing(c.id);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing === "new") {
        await api.post(`${API_BASE}/coupons`, form, opts);
        toast.success(`Coupon ${form.code.toUpperCase()} created`);
      } else {
        await api.put(`${API_BASE}/coupons/${encodeURIComponent(editing!)}`, form, opts);
        toast.success("Coupon saved");
      }
      setEditing(null);
      await refetch();
    } catch (err: any) {
      setError(err.message || "Could not save the coupon");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Coupon) => {
    try {
      await api.put(`${API_BASE}/coupons/${encodeURIComponent(c.id)}`, { active: !c.active }, opts);
      toast.success(`${c.code} switched ${c.active ? "off" : "on"}`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update the coupon");
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(c.uses > 0 ? `${c.code} has been used, so it will be switched off rather than deleted. Continue?` : `Delete ${c.code}?`)) return;
    try {
      const result = await api.delete(`${API_BASE}/coupons/${encodeURIComponent(c.id)}`, opts);
      toast.success(result.deleted ? `${c.code} deleted` : `${c.code} switched off`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not delete the coupon");
    }
  };

  const showUses = async (c: Coupon) => {
    if (usesOf === c.id) {
      setUsesOf(null);
      return;
    }
    setUsesOf(c.id);
    setRedemptions(null);
    try {
      setRedemptions(await api.get(`${API_BASE}/coupons/${encodeURIComponent(c.id)}/redemptions`, opts));
    } catch (err: any) {
      toast.error(err.message || "Could not load where it was used");
      setUsesOf(null);
    }
  };

  const copy = (code: string) => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const scopeLabel = (c: Coupon) =>
    c.appliesTo === "products"
      ? c.productIds.length === 1 ? productName.get(c.productIds[0]) ?? "1 product" : `${c.productIds.length} products`
      : c.merchantId ? (platform ? `All of ${c.merchantName ?? "the merchant"}'s products` : "All your products") : "Everything in the store";

  const rules = (c: Coupon) => [
    c.maxDiscount !== null && `up to ${naira(c.maxDiscount)}`,
    c.minSubtotal !== null && `min. spend ${naira(c.minSubtotal)}`,
    c.firstOrderOnly && "first orders only",
    c.perCustomerLimit !== null && `${c.perCustomerLimit}× per customer`,
    c.startsAt && `from ${when(c.startsAt)}`,
    c.endsAt && `until ${when(c.endsAt)}`,
  ].filter(Boolean).join(" · ");

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(productFilter.toLowerCase()));
  const toggleProduct = (id: string) =>
    set({ productIds: form.productIds.includes(id) ? form.productIds.filter((x) => x !== id) : [...form.productIds, id] });

  const fieldStyle = { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background)' };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm max-w-xl" style={{ color: 'var(--color-text-secondary)' }}>
          {platform
            ? "Store-wide coupons are paid for by the platform: merchants still receive their full share."
            : "Coupons cover your own products, and the discount comes out of your share. Buyers enter the code at checkout."}
        </p>
        {editing === null && (
          <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1.5" /> New coupon</Button>
        )}
      </div>

      {editing !== null && (
        <div className="p-4 rounded-xl border space-y-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{editing === "new" ? "New coupon" : `Edit ${form.code}`}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Code" hint="Letters, numbers, - or _. Buyers type it at checkout.">
              <Input value={form.code} maxLength={32} placeholder="e.g. WELCOME10"
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} />
            </Field>
            <Field label="Discount">
              <div className="flex gap-2">
                <select value={form.kind} onChange={(e) => set({ kind: e.target.value as Form["kind"] })}
                  className="px-3 py-2 rounded-lg border text-sm" style={fieldStyle} aria-label="Discount type">
                  <option value="percent">% off</option>
                  <option value="fixed">₦ off</option>
                </select>
                <Input inputMode="decimal" value={form.value} placeholder={form.kind === "percent" ? "10" : "500"}
                  onChange={(e) => set({ value: e.target.value })} aria-label="Amount off" />
              </div>
            </Field>
            {form.kind === "percent" && (
              <Field label="Most it takes off (optional)" hint="A cap in naira, e.g. 2000.">
                <Input inputMode="numeric" value={form.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
              </Field>
            )}
            <Field label="Minimum spend (optional)" hint="On the items the coupon covers.">
              <Input inputMode="numeric" value={form.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} />
            </Field>
            <Field label="Starts (optional)" hint="Lagos time.">
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
            </Field>
            <Field label="Ends (optional)" hint="Lagos time.">
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
            </Field>
            <Field label="Total uses (optional)" hint="Blank for no limit.">
              <Input inputMode="numeric" value={form.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} />
            </Field>
            <Field label="Uses per customer" hint="Blank for no limit.">
              <Input inputMode="numeric" value={form.perCustomerLimit} onChange={(e) => set({ perCustomerLimit: e.target.value })} />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Covers</p>
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <label className="flex items-center gap-2">
                <input type="radio" checked={form.appliesTo === "all"} onChange={() => set({ appliesTo: "all" })} />
                {platform ? "Everything in the store" : "All my products"}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={form.appliesTo === "products"} onChange={() => set({ appliesTo: "products" })} />
                Chosen products
              </label>
            </div>
            {form.appliesTo === "products" && (
              <div className="space-y-2 max-w-xl">
                <Input placeholder="Search products" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} />
                <div className="max-h-56 overflow-y-auto rounded-lg border p-2 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                  {filteredProducts.length === 0 && (
                    <p className="text-xs p-1" style={{ color: 'var(--color-text-muted)' }}>No products match.</p>
                  )}
                  {filteredProducts.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm px-1 py-0.5" style={{ color: 'var(--color-text-primary)' }}>
                      <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                      <span className="truncate">{p.name}</span>
                      {platform && p.merchantName && (
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>· {p.merchantName}</span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{form.productIds.length} chosen</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => set({ firstOrderOnly: e.target.checked })} />
              First orders only
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
              Active
            </label>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save coupon"}</Button>
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {coupons.length === 0 && editing === null && (
        <p className="text-sm p-6 rounded-xl border text-center" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          No coupons yet.
        </p>
      )}

      <div className="space-y-2">
        {coupons.map((c) => {
          const status = statusOf(c);
          const readOnly = platform && c.merchantId !== null;
          return (
            <div key={c.id} className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => copy(c.code)} title="Copy code"
                      className="inline-flex items-center gap-1.5 font-mono font-semibold px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text-primary)' }}>
                      {c.code}
                      {copied === c.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.label}</span>
                    <span className="text-xs font-medium" style={{ color: status.color }}>● {status.label}</span>
                    {platform && (
                      <span className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        {c.merchantId ? `Merchant: ${c.merchantName ?? c.merchantId}` : "Platform"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{scopeLabel(c)}</p>
                  {rules(c) && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{rules(c)}</p>}
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Used {c.uses}{c.usageLimit !== null ? ` of ${c.usageLimit}` : ""} time{c.uses === 1 ? "" : "s"} · {naira(c.discountGiven)} off so far
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => void showUses(c)}><Users className="h-4 w-4 mr-1" /> Uses</Button>
                  <Button size="sm" variant="outline" onClick={() => void toggle(c)}>
                    <Power className="h-4 w-4 mr-1" /> {c.active ? "Switch off" : "Switch on"}
                  </Button>
                  {!readOnly && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(c)} aria-label={`Edit ${c.code}`}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => void remove(c)} aria-label={`Delete ${c.code}`}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
              </div>

              {usesOf === c.id && (
                <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Orders it was used on</p>
                    <button type="button" onClick={() => setUsesOf(null)} aria-label="Close"><X className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} /></button>
                  </div>
                  {redemptions === null && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
                  {redemptions?.length === 0 && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Not used yet.</p>}
                  {redemptions?.map((r) => (
                    <div key={r.orderId} className="flex flex-wrap justify-between gap-2 text-xs" style={{ color: r.counts ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                      <span className="font-mono">{r.orderId}</span>
                      <span className="truncate">{r.email}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      <span>−{naira(r.amount)}{r.counts ? "" : ` (${r.orderStatus === "cancelled" ? "cancelled" : "unpaid"})`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
    </div>
  );
}
