import { useState } from "react";
import { Percent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface CommissionProduct {
  id: string;
  commissionSummary?: string;
  commissionType?: "percentage" | "flat" | null;
  commissionRate?: number | null;
  pendingCommissionType?: "percentage" | "flat" | null;
  pendingCommissionRate?: number | null;
  pendingCommissionProposedBy?: "admin" | "merchant" | null;
}

const formatRate = (type?: string | null, rate?: number | null) =>
  type === "flat" ? `₦${Number(rate).toFixed(2)} flat` : `${Number(rate).toFixed(2)}%`;

// Negotiated, not unilateral: either side proposes a per-product override,
// but it only takes effect once the OTHER side accepts. Used on both the
// admin Products page and the merchant's own Products page - the role check
// below decides which controls are visible, the backend enforces the rest.
export function CommissionNegotiation({ product, onUpdated }: { product: CommissionProduct; onUpdated: () => void }) {
  const { user, authHeader } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>(product.commissionType ?? "percentage");
  const [rate, setRate] = useState<string>(product.commissionRate != null ? String(product.commissionRate) : "");
  const [submitting, setSubmitting] = useState(false);

  const role = user?.role;
  const proposedBy = product.pendingCommissionProposedBy;
  const hasPending = !!proposedBy;
  const isMyProposal = hasPending && proposedBy === role;
  const canRespond = hasPending && !isMyProposal && (role === "admin" || role === "merchant");

  const propose = async () => {
    const rateNum = Number(rate);
    if (!rate || Number.isNaN(rateNum) || rateNum < 0) {
      toast.error("Enter a valid, non-negative rate");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`${API_BASE}/product-commission`, { productId: product.id, type, rate: rateNum }, { headers: authHeader });
      toast.success("Proposal sent");
      setOpen(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Could not propose rate");
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (accept: boolean) => {
    setSubmitting(true);
    try {
      await api.put(`${API_BASE}/product-commission`, { productId: product.id, accept }, { headers: authHeader });
      toast.success(accept ? "Rate accepted" : "Proposal rejected");
      setOpen(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Could not respond");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Commission" onClick={() => setOpen(true)}>
        <Percent className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commission Rate</DialogTitle>
          </DialogHeader>

          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Current: {product.commissionSummary || "Inherits merchant default"}
          </p>

          {canRespond && (
            <div className="p-3 rounded-lg space-y-3" style={{ border: '1px solid var(--color-border)' }}>
              <p className="text-sm">
                {proposedBy === "admin" ? "Admin" : "The merchant"} proposed{" "}
                {formatRate(product.pendingCommissionType, product.pendingCommissionRate)}.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={submitting} onClick={() => respond(true)}>Accept</Button>
                <Button size="sm" variant="outline" disabled={submitting} onClick={() => respond(false)}>Reject</Button>
              </div>
            </div>
          )}

          {isMyProposal && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Waiting on {proposedBy === "admin" ? "the merchant" : "admin"} to respond to your proposed{" "}
              {formatRate(product.pendingCommissionType, product.pendingCommissionRate)}.
            </p>
          )}

          <div className="space-y-3 pt-1">
            <Label>{hasPending ? "Revise proposal" : "Propose a rate"}</Label>
            <div className="flex gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={type === "flat" ? "e.g. 5.00" : "e.g. 15"} />
            </div>
            <Button size="sm" disabled={submitting} onClick={propose}>Propose</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
