import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { getGuestId } from "../utils/guestId.js";

// The buyer's side of a delivery: before it arrives, the 4-digit code to give
// the seller at the door; once marked delivered, "Did you get it?" - Yes pays
// the seller now (a problem goes through Report a problem instead).
export function DeliveryHandover({ fulfillment, compact = false }: { fulfillment: any; compact?: boolean }) {
  const { user, authHeader } = useAuth();
  const [receivedAt, setReceivedAt] = useState<string | null>(fulfillment.receivedAt ?? null);
  const [busy, setBusy] = useState(false);
  const text = compact ? "text-xs" : "text-sm";

  if (fulfillment.status !== "delivered" && fulfillment.deliveryCode) {
    return (
      <p className={`${text} flex items-center gap-1.5 mt-1`} style={{ color: "var(--color-text-secondary)" }}>
        <KeyRound className="h-3.5 w-3.5" aria-hidden />
        Delivery code: <strong className="tracking-widest" style={{ color: "var(--color-text-primary)" }}>{fulfillment.deliveryCode}</strong>
        <span>· give it to the seller only when you have your order</span>
      </p>
    );
  }
  if (fulfillment.status !== "delivered") return null;
  if (receivedAt) {
    return (
      <p className={`${text} flex items-center gap-1.5 mt-1`} style={{ color: "var(--color-success)" }}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> You confirmed you got it.
      </p>
    );
  }
  const yes = async () => {
    setBusy(true);
    try {
      const r = await api.post(`${API_BASE}/order-fulfillment/${encodeURIComponent(fulfillment.id)}/received`,
        user ? {} : { guestId: getGuestId() }, { headers: authHeader });
      setReceivedAt(r.receivedAt ?? new Date().toISOString());
      toast.success("Thanks! The seller will be paid.");
    } catch (e: any) {
      toast.error(e.message || "Couldn't save that");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`${text} flex flex-wrap items-center gap-2 mt-1`} style={{ color: "var(--color-text-secondary)" }}>
      <span>Did you get it?</span>
      <button type="button" disabled={busy} onClick={() => void yes()} className="px-2.5 py-1 rounded font-medium disabled:opacity-50"
        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-ink, #fff)" }}>
        Yes, I got it
      </button>
      <span>If not, or something's wrong, use Report a problem.</span>
    </div>
  );
}
