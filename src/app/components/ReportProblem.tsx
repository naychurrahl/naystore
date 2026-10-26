import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useAuth } from "../context/AuthContext";

interface Seller { merchantId: string; name: string; canReport: boolean }
interface Report {
  id: string;
  merchantName: string | null;
  message: string;
  status: "open" | "released" | "refunded";
  resolutionNote: string | null;
  createdAt: string;
}

const STATUS_TEXT: Record<Report["status"], string> = {
  open: "We're looking into it",
  released: "Closed",
  refunded: "Order cancelled and refunded",
};

// "Report a problem" on an order: holds that seller's payout for the order
// until the Naychurrahl team has looked into it. Available until the
// seller has been paid for it.
export function ReportProblem({ orderId }: { orderId: string }) {
  const { user, authHeader } = useAuth();
  const guestId = user ? null : getGuestId();
  const url = `${API_BASE}/orders/${encodeURIComponent(orderId)}/reports${guestId ? `?guestId=${encodeURIComponent(guestId)}` : ""}`;
  const { data, refetch } = useAPI(url, { headers: authHeader });
  const [open, setOpen] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellers = ((data?.sellers ?? []) as Seller[]).filter((s) => s.canReport);
  const reports = (data?.reports ?? []) as Report[];
  if (!data || (sellers.length === 0 && reports.length === 0)) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api.post(`${API_BASE}/orders/${encodeURIComponent(orderId)}/reports`, {
        merchantId: sellers.length === 1 ? sellers[0].merchantId : merchantId,
        message,
        guestId: guestId ?? undefined,
      }, { headers: authHeader });
      toast.success("Thanks - we've received your report and will be in touch");
      setOpen(false);
      setMessage("");
      await refetch();
    } catch (err: any) {
      setError(err.message || "Could not send your report");
    } finally {
      setSending(false);
    }
  };

  const fieldStyle = { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background)' };

  return (
    <div className="mt-8 p-4 rounded-lg space-y-3" style={{ border: '1px solid var(--color-border)' }}>
      <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
        <AlertTriangle className="h-4 w-4" /> Problem with this order?
      </h2>

      {reports.map((r) => (
        <div key={r.id} className="text-sm p-3 rounded-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <p style={{ color: 'var(--color-text-primary)' }}>
            <strong>{STATUS_TEXT[r.status]}</strong>
            {r.merchantName ? ` · ${r.merchantName}'s items` : ""} · {new Date(r.createdAt).toLocaleDateString()}
          </p>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>"{r.message}"</p>
          {r.resolutionNote && <p className="mt-1 italic" style={{ color: 'var(--color-text-secondary)' }}>{r.resolutionNote}</p>}
        </div>
      ))}

      {sellers.length > 0 && !open && (
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Something missing, damaged or not as described? Tell us before the seller is paid and we'll sort it out.
          </p>
          <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
            Report a problem
          </button>
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="space-y-3">
          {sellers.length > 1 && (
            <select required value={merchantId} onChange={(e) => setMerchantId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm" style={fieldStyle} aria-label="Whose items">
              <option value="" disabled>Whose items is it about?</option>
              {sellers.map((s) => <option key={s.merchantId} value={s.merchantId}>{s.name}</option>)}
            </select>
          )}
          <textarea required rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="What went wrong?" className="w-full px-3 py-2 rounded-lg border text-sm" style={fieldStyle} />
          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              {sending ? "Sending…" : "Send report"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
