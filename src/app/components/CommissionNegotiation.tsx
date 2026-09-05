import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface CommissionProduct {
  id: string;
  commissionType?: "percentage" | "flat" | null;
  commissionRate?: number | null;
  merchantCommissionType?: "percentage" | "flat" | null;
  merchantCommissionRate?: number | null;
  pendingCommissionType?: "percentage" | "flat" | null;
  pendingCommissionRate?: number | null;
  pendingCommissionProposedBy?: "admin" | "merchant" | null;
}

const formatRate = (type?: string | null, rate?: number | null) =>
  type === "flat" ? `₦${Number(rate).toFixed(2)} flat` : `${Number(rate).toFixed(2)}%`;

// Negotiated, not unilateral: either side proposes a per-product override,
// but it only takes effect once the OTHER side accepts. Embedded directly in
// the product edit form (ResourceForm's extraSection) - only meaningful once
// the product already has an id, so it never shows on create.
export function CommissionNegotiation({ product, onUpdated }: { product: CommissionProduct; onUpdated: () => void }) {
  const { user, authHeader } = useAuth();
  const role = user?.role;

  // Local, optimistic copy of the negotiation state - the propose/respond
  // endpoints don't return the updated row, so this component patches its
  // own view immediately and lets onUpdated() refresh the table in the
  // background. Seeded once per dialog open (this component remounts each
  // time the parent Dialog opens, since Radix unmounts closed content).
  const [state, setState] = useState({
    commissionType: product.commissionType ?? null,
    commissionRate: product.commissionRate ?? null,
    pendingCommissionType: product.pendingCommissionType ?? null,
    pendingCommissionRate: product.pendingCommissionRate ?? null,
    pendingCommissionProposedBy: product.pendingCommissionProposedBy ?? null,
  });

  const [type, setType] = useState<string>(state.commissionType ?? product.merchantCommissionType ?? "percentage");
  const [rate, setRate] = useState<string>(
    state.commissionType != null ? String(state.commissionRate)
      : product.merchantCommissionRate != null ? String(product.merchantCommissionRate)
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  // Toggles the Accept/Reject buttons over to a counter-offer form, only
  // meaningful while responding to someone else's proposal (canRespond).
  const [revising, setRevising] = useState(false);

  const proposedBy = state.pendingCommissionProposedBy;
  const hasPending = !!proposedBy;
  const isMyProposal = hasPending && proposedBy === role;
  const canRespond = hasPending && !isMyProposal && (role === "admin" || role === "merchant");

  const currentLabel = state.commissionType != null
    ? `${formatRate(state.commissionType, state.commissionRate)} (override)`
    : product.merchantCommissionType != null
      ? `${formatRate(product.merchantCommissionType, product.merchantCommissionRate)} (your default)`
      : "Inherits your default";

  const propose = async () => {
    const rateNum = Number(rate);
    if (!rate || Number.isNaN(rateNum) || rateNum < 0) {
      toast.error("Enter a valid, non-negative rate");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`${API_BASE}/product-commission`, { productId: product.id, type, rate: rateNum }, { headers: authHeader });
      setState((s) => ({ ...s, pendingCommissionType: type as "percentage" | "flat", pendingCommissionRate: rateNum, pendingCommissionProposedBy: role as "admin" | "merchant" }));
      setRevising(false);
      toast.success(hasPending ? "Counter-offer sent" : "Proposal sent");
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Could not propose rate");
    } finally {
      setSubmitting(false);
    }
  };

  // Seeds the input from the pending offer being countered, not from the
  // product's current effective rate - the useState above only covers the
  // "propose fresh" case.
  const startRevise = () => {
    setType(state.pendingCommissionType ?? "percentage");
    setRate(state.pendingCommissionRate != null ? String(state.pendingCommissionRate) : "");
    setRevising(true);
  };

  const respond = async (accept: boolean) => {
    setSubmitting(true);
    try {
      await api.put(`${API_BASE}/product-commission`, { productId: product.id, accept }, { headers: authHeader });
      setState((s) => ({
        commissionType: accept ? s.pendingCommissionType : s.commissionType,
        commissionRate: accept ? s.pendingCommissionRate : s.commissionRate,
        pendingCommissionType: null,
        pendingCommissionRate: null,
        pendingCommissionProposedBy: null,
      }));
      setRevising(false);
      toast.success(accept ? "Rate accepted" : "Proposal rejected");
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Could not respond");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Current: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{currentLabel}</span>
      </p>

      {canRespond && (
        <div className="p-3 rounded-lg space-y-3" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <p className="text-sm">
            {proposedBy === "admin" ? "Admin" : "The merchant"} proposed{" "}
            {formatRate(state.pendingCommissionType, state.pendingCommissionRate)}.
          </p>
          {revising ? (
            <div className="flex gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={type === "flat" ? "e.g. 5.00" : "e.g. 15"} />
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
          Waiting on {proposedBy === "admin" ? "the merchant" : "admin"} to respond to your proposed{" "}
          {formatRate(state.pendingCommissionType, state.pendingCommissionRate)}.
        </p>
      )}

      {!canRespond && (
        <div className="flex gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="flat">Flat</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={type === "flat" ? "e.g. 5.00" : "e.g. 15"} />
          <Button type="button" size="sm" disabled={submitting} onClick={propose}>{hasPending ? "Revise" : "Propose"}</Button>
        </div>
      )}
    </div>
  );
}
