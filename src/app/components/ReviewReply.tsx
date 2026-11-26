import { useState } from "react";
import { toast } from "sonner";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

// Under a review: the seller's one public reply, or - for that seller - a box
// to write it. kind: a product review, or a review of the shop.
export function ReviewReply({ review, ownerId, kind = "product" }: { review: any; ownerId?: string | null; kind?: "product" | "seller" }) {
  const { user, stores, authHeader } = useAuth();
  const [reply, setReply] = useState<string | null>(review.reply ?? null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (reply) {
    return (
      <div className="mt-2 pl-3 text-sm" style={{ borderLeft: "2px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
        <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>The seller replied: </span>{reply}
      </div>
    );
  }
  // The store's owner and managers reply (whichever of their stores it is).
  if (!user || !ownerId || !stores.some((s) => s.id === ownerId && s.can.includes("reviews"))) return null;
  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post(`${API_BASE}/${kind === "product" ? "reviews" : "seller-reviews"}/${encodeURIComponent(review.id)}/reply`, { reply: draft }, { headers: authHeader });
      setReply(r.reply);
      toast.success("Reply posted");
    } catch (e: any) {
      toast.error(e.message || "Couldn't post the reply");
    } finally {
      setBusy(false);
    }
  };
  if (!open) {
    return <button type="button" className="mt-2 text-sm underline" style={{ color: "var(--color-primary)" }} onClick={() => setOpen(true)}>Reply (once, shown to everyone)</button>;
  }
  return (
    <div className="mt-2 grid gap-2">
      <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} aria-label="Your reply"
        className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
      <div className="flex gap-2">
        <button type="button" disabled={busy || !draft.trim()} onClick={() => void send()} className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-ink, #fff)" }}>Post reply</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded text-sm" style={{ color: "var(--color-text-secondary)" }}>Cancel</button>
      </div>
    </div>
  );
}
