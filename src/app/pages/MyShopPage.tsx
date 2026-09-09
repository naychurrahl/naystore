import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ImageUploadField } from "../components/ImageUploadField";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { NIGERIA_STATE_LGAS, NIGERIA_STATES } from "../data/nigeriaStates";

const formatRate = (type?: string | null, rate?: number | null) =>
  type === "flat" ? `₦${Number(rate).toFixed(2)} flat` : `${Number(rate).toFixed(2)}%`;

interface CommissionState {
  commissionType: "percentage" | "flat" | null;
  commissionRate: number | null;
  pendingCommissionType: "percentage" | "flat" | null;
  pendingCommissionRate: number | null;
  pendingCommissionProposedBy: "admin" | "merchant" | null;
}

// Negotiated, not unilateral: a merchant proposes a new default commission
// rate, but it only takes effect once admin accepts it (and vice versa) -
// same model as the per-product override on MerchantProductsPage, just for
// the account-wide default rather than one product.
function CommissionSection({ state, onProposed }: { state: CommissionState; onProposed: (next: CommissionState) => void }) {
  const { authHeader } = useAuth();
  const [type, setType] = useState<string>(state.commissionType ?? "percentage");
  const [rate, setRate] = useState<string>(state.commissionRate != null ? String(state.commissionRate) : "");
  const [submitting, setSubmitting] = useState(false);
  const [revising, setRevising] = useState(false);

  const proposedBy = state.pendingCommissionProposedBy;
  const hasPending = !!proposedBy;
  const isMyProposal = hasPending && proposedBy === "merchant";
  const canRespond = hasPending && !isMyProposal;

  const currentLabel = state.commissionType != null
    ? formatRate(state.commissionType, state.commissionRate)
    : "Not set";

  const propose = async () => {
    const rateNum = Number(rate);
    if (!rate || Number.isNaN(rateNum) || rateNum < 0) {
      toast.error("Enter a valid, non-negative rate");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`${API_BASE}/merchant-commission`, { type, rate: rateNum }, { headers: authHeader });
      onProposed({ ...state, pendingCommissionType: type as "percentage" | "flat", pendingCommissionRate: rateNum, pendingCommissionProposedBy: "merchant" });
      setRevising(false);
      toast.success(hasPending ? "Counter-offer sent" : "Proposal sent");
    } catch (err: any) {
      toast.error(err.message || "Could not propose rate");
    } finally {
      setSubmitting(false);
    }
  };

  const startRevise = () => {
    setType(state.pendingCommissionType ?? "percentage");
    setRate(state.pendingCommissionRate != null ? String(state.pendingCommissionRate) : "");
    setRevising(true);
  };

  const respond = async (accept: boolean) => {
    setSubmitting(true);
    try {
      await api.put(`${API_BASE}/merchant-commission`, { accept }, { headers: authHeader });
      onProposed({
        commissionType: accept ? state.pendingCommissionType : state.commissionType,
        commissionRate: accept ? state.pendingCommissionRate : state.commissionRate,
        pendingCommissionType: null,
        pendingCommissionRate: null,
        pendingCommissionProposedBy: null,
      });
      setRevising(false);
      toast.success(accept ? "Rate accepted" : "Proposal rejected");
    } catch (err: any) {
      toast.error(err.message || "Could not respond");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Commission</h3>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Your default rate: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{currentLabel}</span>
      </p>

      {canRespond && (
        <div className="p-3 rounded-lg space-y-3" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <p className="text-sm">Admin proposed {formatRate(state.pendingCommissionType, state.pendingCommissionRate)}.</p>
          {revising ? (
            <div className="flex flex-wrap gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={type === "flat" ? "e.g. 5.00" : "e.g. 15"} className="w-32" />
              <Button type="button" size="sm" disabled={submitting} onClick={propose}>Send Counter-Offer</Button>
              <Button type="button" size="sm" variant="outline" disabled={submitting} onClick={() => setRevising(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={submitting} onClick={() => respond(true)}>Accept</Button>
              <Button type="button" size="sm" variant="outline" disabled={submitting} onClick={() => respond(false)}>Reject</Button>
              <Button type="button" size="sm" variant="ghost" disabled={submitting} onClick={startRevise}>Revise</Button>
            </div>
          )}
        </div>
      )}

      {isMyProposal && (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Waiting on admin to respond to your proposed {formatRate(state.pendingCommissionType, state.pendingCommissionRate)}.
        </p>
      )}

      {!canRespond && !isMyProposal && (
        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="flat">Flat</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={type === "flat" ? "e.g. 5.00" : "e.g. 15"} className="w-32" />
          <Button type="button" size="sm" disabled={submitting} onClick={propose}>Propose New Rate</Button>
        </div>
      )}
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Changing your default rate is negotiated with admin - either side can propose, it takes effect once the other accepts.
      </p>
    </div>
  );
}

function FulfillmentSection({ method, onChange }: { method: string | null; onChange: (method: string) => void }) {
  const { authHeader } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string) => {
    setSaving(true);
    try {
      await api.put(`${API_BASE}/my-fulfillment`, { fulfillmentMethod: value }, { headers: authHeader });
      onChange(value);
      toast.success("Fulfillment method updated");
    } catch (err: any) {
      toast.error(err.message || "Could not update fulfillment method");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Fulfillment Method</h3>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <strong>FBU (Fulfilled by Us)</strong>: we handle shipping for your orders. <strong>FBM (Fulfilled by Merchant)</strong>: you're
        responsible for shipping and keeping tracking info up to date. This is your default - you can still override it per product.
      </p>
      {method !== null && (
        <Select value={method} onValueChange={handleChange} disabled={saving}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fbu">FBU - Fulfilled by Us</SelectItem>
            <SelectItem value="fbm">FBM - Fulfilled by Merchant</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function MyShopPage() {
  const { authHeader } = useAuth();
  const [form, setForm] = useState({
    slug: "", bio: "",
    state: "", lga: "", area: "", landmark: "", location: "",
    bannerImage: "",
  });
  const [commission, setCommission] = useState<CommissionState>({
    commissionType: null, commissionRate: null,
    pendingCommissionType: null, pendingCommissionRate: null, pendingCommissionProposedBy: null,
  });
  const [fulfillmentMethod, setFulfillmentMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`${API_BASE}/my-shop`, { headers: authHeader })
      .then((shop) => {
        setForm({
          slug: shop.slug ?? "", bio: shop.bio ?? "",
          state: shop.state ?? "", lga: shop.lga ?? "", area: shop.area ?? "", landmark: shop.landmark ?? "", location: shop.location ?? "",
          bannerImage: shop.bannerImage ?? "",
        });
        setCommission({
          commissionType: shop.commissionType ?? null,
          commissionRate: shop.commissionRate ?? null,
          pendingCommissionType: shop.pendingCommissionType ?? null,
          pendingCommissionRate: shop.pendingCommissionRate ?? null,
          pendingCommissionProposedBy: shop.pendingCommissionProposedBy ?? null,
        });
        setFulfillmentMethod(shop.fulfillmentMethod ?? "fbm");
      })
      .catch((err: any) => toast.error(err.message || "Could not load shop"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSlugError(null);
    try {
      const updated = await api.put(`${API_BASE}/my-shop`, form, { headers: authHeader });
      setForm({
        slug: updated.slug ?? "", bio: updated.bio ?? "",
        state: updated.state ?? "", lga: updated.lga ?? "", area: updated.area ?? "", landmark: updated.landmark ?? "", location: updated.location ?? "",
        bannerImage: updated.bannerImage ?? "",
      });
      toast.success("Shop saved");
    } catch (err: any) {
      if (err.status === 409) {
        setSlugError(err.message);
      } else {
        toast.error(err.message || "Could not save shop");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>My Shop</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Your public shop page - what buyers see when they click "Sold by" on one of your products.
      </p>

      <div className="p-6 rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Shop URL</Label>
            <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <span
                className="px-3 flex items-center text-sm shrink-0"
                style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
              >
                /sellers/
              </span>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="your-shop-name"
                className="border-0 rounded-none focus-visible:ring-0"
              />
            </div>
            {slugError && <p className="text-sm mt-1" style={{ color: 'var(--color-error)' }}>{slugError}</p>}
          </div>

          <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Shop Location</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">State</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, lga: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {NIGERIA_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">LGA</Label>
                <Select value={form.lga} onValueChange={(v) => setForm({ ...form, lga: v })} disabled={!form.state}>
                  <SelectTrigger><SelectValue placeholder={form.state ? "Select LGA" : "Select state first"} /></SelectTrigger>
                  <SelectContent>
                    {(NIGERIA_STATE_LGAS[form.state] ?? []).map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Area</Label>
              <Input
                required
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="e.g. Ikeja GRA"
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Landmark (optional)</Label>
              <Input
                value={form.landmark}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                placeholder="e.g. Near Shoprite"
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Location</Label>
              <Input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. 12 Allen Avenue, Ibadan"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Shown on your public shop page.
              </p>
            </div>

            {(form.location || form.landmark || form.area || form.lga || form.state) && (
              <p className="text-xs pt-1" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
                {[form.location, form.landmark, form.area, form.lga, form.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          <CommissionSection state={commission} onProposed={setCommission} />

          <FulfillmentSection method={fulfillmentMethod} onChange={setFulfillmentMethod} />

          <div>
            <Label className="mb-1.5 block">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              placeholder="Tell buyers about your shop"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Banner Image</Label>
            <ImageUploadField
              value={form.bannerImage}
              onChange={(url) => setForm({ ...form, bannerImage: url })}
              folder="shop"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shop"}</Button>
            {form.slug && (
              <a
                href={`/sellers/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                <ExternalLink className="h-4 w-4" />
                View my shop
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
