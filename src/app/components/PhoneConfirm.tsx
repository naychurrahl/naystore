import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

// Confirms the account's saved phone number with a text code. Shown only
// while texts are set up (settings.phoneCodes). A shop may need it before
// it's paid (settings.phoneCodeBeforePayout).
export function PhoneConfirm({ phone }: { phone: string }) {
  const { authHeader } = useAuth();
  const { data: settings } = useAPI(`${API_BASE}/settings`);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`${API_BASE}/profile`, { headers: authHeader }).then((p: any) => setVerified(!!p.phoneVerified)).catch(() => {});
  }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!(settings as any)?.phoneCodes || !phone || verified === null) return null;
  if (verified) {
    return <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--color-success)" }}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Phone confirmed</p>;
  }
  const run = async (step: "phone-code" | "phone-verify") => {
    setBusy(true);
    try {
      const r = await api.post(`${API_BASE}/profile/${step}`, step === "phone-verify" ? { code } : {}, { headers: authHeader });
      if (r.verified) { setVerified(true); toast.success("Phone confirmed"); }
      else if (r.sent) setSentTo(r.to);
    } catch (e: any) {
      toast.error(e.message || "That didn't work");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2 p-3 rounded-lg grid gap-2 text-sm" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
      <p>
        Confirm this number with a text code{(settings as any)?.phoneCodeBeforePayout ? ". Shops need it before they're paid." : "."} Save any change to the number first.
      </p>
      {!sentTo ? (
        <div><button type="button" disabled={busy} onClick={() => void run("phone-code")} className="px-3 py-1.5 rounded font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-ink, #fff)" }}>Text me a code</button></div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span>Code sent to {sentTo}:</span>
          <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code from the text"
            className="w-28 h-9 px-2 rounded border bg-transparent" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
          <button type="button" disabled={busy || code.length < 6} onClick={() => void run("phone-verify")} className="px-3 py-1.5 rounded font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-ink, #fff)" }}>Confirm</button>
          <button type="button" disabled={busy} onClick={() => void run("phone-code")} className="underline">Send again</button>
        </div>
      )}
    </div>
  );
}
