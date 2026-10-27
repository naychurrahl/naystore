import { useEffect, useState, type FormEvent } from "react";
import { PasswordInput } from "./PasswordInput";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

const inputStyle = { borderColor: "var(--color-border)", color: "var(--color-text-primary)" };
const labelStyle = { color: "var(--color-text-primary)" };
const mutedStyle = { color: "var(--color-text-muted)" };

// Seconds left before another code can be asked for.
function useCountdown(): [number, (seconds: number) => void] {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (until <= now) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until, now]);
  return [Math.max(0, Math.ceil((until - now) / 1000)), (seconds) => { setNow(Date.now()); setUntil(Date.now() + seconds * 1000); }];
}

// The 6-digit code box, with "Send a new code" once the minute is up.
export function CodeField({ value, onChange, sentTo, onResend, resendIn }: {
  value: string;
  onChange: (code: string) => void;
  sentTo: string;
  onResend: () => Promise<number | void>;
  resendIn: number;
}) {
  const [left, start] = useCountdown();
  const [resending, setResending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => start(resendIn), []); // eslint-disable-line react-hooks/exhaustive-deps

  const resend = async () => {
    setResending(true);
    setNote(null);
    try {
      start((await onResend()) || 60);
      setNote("A new code is on its way.");
    } catch (err: any) {
      setNote(err.message || "Could not send a new code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        We've emailed a 6-digit code to <strong style={labelStyle}>{sentTo}</strong>. It expires in 10 minutes - check your spam folder if it isn't there.
      </p>
      <label className="block text-sm font-medium" style={labelStyle}>Code</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        autoFocus
        maxLength={6}
        pattern="\d{6}"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="w-full px-4 py-3 rounded-lg border text-center text-2xl tracking-[0.5em] font-mono"
        style={inputStyle}
        aria-label="6-digit code"
      />
      <p className="text-xs" style={mutedStyle}>
        {left > 0 ? `You can ask for a new code in ${left}s.` : (
          <button type="button" disabled={resending} onClick={() => void resend()} className="underline" style={{ color: "var(--color-primary)" }}>
            {resending ? "Sending…" : "Send a new code"}
          </button>
        )}
        {note ? ` ${note}` : ""}
      </p>
    </div>
  );
}

// "Forgot password": email or username -> code by email -> new password.
// onDone gets what to log in with.
export function ForgotPasswordForm({ initialIdentifier = "", onDone, onBack }: {
  initialIdentifier?: string;
  onDone: (identifier: string, password: string) => Promise<void> | void;
  onBack: () => void;
}) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [sent, setSent] = useState<{ resendIn: number } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCode = async () => {
    const result = await api.post(`${API_BASE}/forgot-password`, { email: identifier.trim() });
    return result.resendIn as number;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!sent) {
        setSent({ resendIn: await requestCode() });
      } else {
        await api.post(`${API_BASE}/reset-password`, { email: identifier.trim(), code, newPassword: password });
        await onDone(identifier.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {!sent ? (
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Email or Username</label>
          <input type="text" required autoFocus value={identifier} onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border" style={inputStyle} />
          <p className="text-xs mt-1" style={mutedStyle}>We'll email a code to the address on the account.</p>
        </div>
      ) : (
        <>
          <CodeField value={code} onChange={setCode} sentTo="the address on that account (if it exists)" onResend={requestCode} resendIn={sent.resendIn} />
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>New password</label>
            <PasswordInput native required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border" style={inputStyle} />
            <p className="text-xs mt-1" style={mutedStyle}>At least 8 characters. You'll be signed out on your other devices.</p>
          </div>
        </>
      )}

      {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

      <button type="submit" disabled={submitting || (!!sent && (code.length !== 6 || password.length < 8))}
        className="w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
        {submitting ? "Please wait…" : sent ? "Reset password" : "Email me a code"}
      </button>
      <p className="text-sm text-center">
        <button type="button" onClick={sent ? () => { setSent(null); setCode(""); setError(null); } : onBack} style={{ color: "var(--color-primary)" }}>
          {sent ? "Use a different email or username" : "Back to log in"}
        </button>
      </p>
    </form>
  );
}
