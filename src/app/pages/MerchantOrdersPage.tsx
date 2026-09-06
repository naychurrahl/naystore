import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Truck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { NIGERIA_STATES } from "../data/nigeriaStates";

const STATUSES = ["processing", "shipped", "in_transit", "delivered"];

const ORDER_STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  pending: { bg: 'var(--color-accent-light)', fg: 'var(--color-accent)' },
  confirmed: { bg: 'var(--color-primary-light)', fg: 'var(--color-primary)' },
  fulfilled: { bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
  cancelled: { bg: 'var(--color-error-light)', fg: 'var(--color-error)' },
};

const FULFILLMENT_STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  processing: { bg: 'var(--color-accent-light)', fg: 'var(--color-accent)' },
  shipped: { bg: 'var(--color-primary-light)', fg: 'var(--color-primary)' },
  in_transit: { bg: 'var(--color-primary-light)', fg: 'var(--color-primary)' },
  delivered: { bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
};

function StatusPill({ value, tones }: { value: string; tones: Record<string, { bg: string; fg: string }> }) {
  const tone = tones[value] ?? { bg: 'var(--color-surface-alt)', fg: 'var(--color-text-secondary)' };
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {value.replace("_", " ")}
    </span>
  );
}

interface FulfillmentForm {
  city: string;
  state: string;
  country: string;
  status: string;
  contactPhone: string;
  contactEmail: string;
  trackingId: string;
  trackingLink: string;
}

function toForm(row: any): FulfillmentForm {
  return {
    city: row.city ?? "",
    state: row.state ?? "",
    country: row.country ?? "",
    status: row.status ?? "processing",
    contactPhone: row.contactPhone ?? "",
    contactEmail: row.contactEmail ?? "",
    trackingId: row.meta?.trackingId ?? "",
    trackingLink: row.meta?.trackingLink ?? "",
  };
}

function FulfillmentMethodCard() {
  const { authHeader } = useAuth();
  const [method, setMethod] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`${API_BASE}/my-fulfillment`, { headers: authHeader })
      .then((r) => setMethod(r.fulfillmentMethod))
      .catch((err: any) => toast.error(err.message || "Could not load fulfillment method"));
  }, []);

  const handleChange = async (value: string) => {
    setSaving(true);
    try {
      await api.put(`${API_BASE}/my-fulfillment`, { fulfillmentMethod: value }, { headers: authHeader });
      setMethod(value);
      toast.success("Fulfillment method updated");
    } catch (err: any) {
      toast.error(err.message || "Could not update fulfillment method");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Fulfillment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
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
      </CardContent>
    </Card>
  );
}

export function MerchantOrdersPage() {
  const { authHeader } = useAuth();
  const { data, loading, error, refetch } = useAPI(`${API_BASE}/merchant-orders`, { headers: authHeader });
  const orders = (data ?? []) as any[];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, FulfillmentForm>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const getForm = (row: any): FulfillmentForm => forms[row.id] ?? toForm(row);
  const setField = (rowId: string, row: any, key: keyof FulfillmentForm, value: string) => {
    setForms((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] ?? toForm(row)), [key]: value } }));
  };

  const handleSave = async (row: any) => {
    const form = getForm(row);
    setSaving(row.id);
    try {
      await api.put(`${API_BASE}/order-fulfillment/${row.id}`, {
        city: form.city,
        state: form.state,
        country: form.country,
        status: form.status,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        meta: { trackingId: form.trackingId, trackingLink: form.trackingLink },
      }, { headers: authHeader });
      toast.success("Fulfillment updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update fulfillment");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Orders</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Orders containing your products, and their own line items only.
      </p>

      <FulfillmentMethodCard />

      {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--color-error)' }}>Couldn't load orders.</p>}

      {!loading && !error && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                <TableHead></TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Order</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Customer</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Order Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Placed</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Fulfillment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((row) => {
                const isFbm = row.fulfillmentMethod === "fbm";
                const form = getForm(row);
                return (
                  <Fragment key={row.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                      <TableCell>{expanded === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.orderId}</TableCell>
                      <TableCell style={{ color: 'var(--color-text-primary)' }}>{row.customerName}</TableCell>
                      <TableCell><StatusPill value={row.orderStatus} tones={ORDER_STATUS_TONE} /></TableCell>
                      <TableCell style={{ color: 'var(--color-text-secondary)' }}>{new Date(row.orderCreatedAt).toLocaleDateString()}</TableCell>
                      <TableCell><StatusPill value={row.status} tones={FULFILLMENT_STATUS_TONE} /></TableCell>
                    </TableRow>
                    {expanded === row.id && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                              <div>
                                <p style={{ color: 'var(--color-text-muted)' }}>Contact</p>
                                <p style={{ color: 'var(--color-text-primary)' }}>{row.email} · {row.phone}</p>
                              </div>
                              <div>
                                <p style={{ color: 'var(--color-text-muted)' }}>Ship To</p>
                                <p style={{ color: 'var(--color-text-primary)' }}>{row.fullAddress}</p>
                              </div>
                            </div>

                            <div className="space-y-1 mb-4">
                              {row.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                  <span>{item.quantity} × {item.name}</span>
                                  <span>₦{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <Truck className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                              <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                {isFbm ? "You fulfill this order" : "Fulfilled by us"}
                              </span>
                            </div>

                            {!isFbm && (
                              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                We handle shipping for this order. Contact staff if something needs to change.
                              </p>
                            )}

                            {isFbm && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <Label className="mb-1 block text-xs">City</Label>
                                  <Input value={form.city} onChange={(e) => setField(row.id, row, "city", e.target.value)} />
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">State</Label>
                                  <Select value={form.state} onValueChange={(v) => setField(row.id, row, "state", v)}>
                                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                                    <SelectContent>
                                      {NIGERIA_STATES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">Country</Label>
                                  <Input value={form.country} onChange={(e) => setField(row.id, row, "country", e.target.value)} />
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">Status</Label>
                                  <Select value={form.status} onValueChange={(v) => setField(row.id, row, "status", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">Contact Phone</Label>
                                  <Input value={form.contactPhone} onChange={(e) => setField(row.id, row, "contactPhone", e.target.value)} />
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">Contact Email</Label>
                                  <Input value={form.contactEmail} onChange={(e) => setField(row.id, row, "contactEmail", e.target.value)} />
                                </div>
                                <div />
                                <div>
                                  <Label className="mb-1 block text-xs">Tracking ID (optional)</Label>
                                  <Input value={form.trackingId} onChange={(e) => setField(row.id, row, "trackingId", e.target.value)} />
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">Tracking Link (optional)</Label>
                                  <Input value={form.trackingLink} onChange={(e) => setField(row.id, row, "trackingLink", e.target.value)} />
                                </div>
                                <div className="sm:col-span-2">
                                  <Button size="sm" disabled={saving === row.id} onClick={() => handleSave(row)}>
                                    {saving === row.id ? "Saving..." : "Save"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
