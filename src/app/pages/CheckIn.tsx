import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import QrScanner from "qr-scanner";
import { CheckCircle2, AlertTriangle, XCircle, Undo2, Users } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { formatEventTime } from "../utils/eventTime";

interface Session {
  productId: string;
  eventName: string;
  startsAt: string;
  organizer: boolean;
  total: number;
  checkedIn: number;
}

interface ScanResult {
  result: "ok" | "already" | "void" | "wrong_event" | "not_found" | "undone";
  ticket: { code: string; attendeeName: string; tierName: string; checkedInAt: string | null } | null;
  otherEvent?: string;
  checkedInBy?: string;
  total: number;
  checkedIn: number;
}

const RESULT_STYLE: Record<ScanResult["result"], { bg: string; title: string; Icon: typeof CheckCircle2 }> = {
  ok: { bg: "#15803d", title: "Welcome in", Icon: CheckCircle2 },
  undone: { bg: "#475569", title: "Check-in undone", Icon: Undo2 },
  already: { bg: "#b45309", title: "Already checked in", Icon: AlertTriangle },
  void: { bg: "#b91c1c", title: "Ticket cancelled", Icon: XCircle },
  wrong_event: { bg: "#b91c1c", title: "Wrong event", Icon: XCircle },
  not_found: { bg: "#b91c1c", title: "Not a valid ticket", Icon: XCircle },
};

// Door scanner, opened two ways: /check-in/<productId> by the organizer
// (owner merchant, admin or staff, logged in on the store) or /door/<token>
// by door staff with the event's PIN. Scans the ticket QR with the phone
// camera; codes can also be typed in. The backend decides every outcome.
export function CheckIn() {
  const { productId, token } = useParams();
  const { user, authHeader } = useAuth();
  const isDoor = !!token;

  const [pin, setPin] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(!isDoor);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const recent = useRef<{ code: string; at: number } | null>(null);

  const cred = isDoor ? { token, pin } : { productId };
  const headers = !isDoor && user ? { headers: authHeader } : {};

  const open = async () => {
    setOpening(true);
    setError(null);
    try {
      const query = isDoor
        ? `token=${encodeURIComponent(token!)}&pin=${encodeURIComponent(pin)}`
        : `productId=${encodeURIComponent(productId!)}`;
      setSession(await api.get(`${API_BASE}/checkin?${query}`, headers));
    } catch (err: any) {
      setError(err.status === 401 ? "Log in on the store as the event's organizer to use this scanner." : err.message || "Could not open the scanner");
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    if (!isDoor) void open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoor, user]);

  const submit = useCallback(async (code: string, undo = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = (await api.post(`${API_BASE}/checkin`, { code, undo, ...cred }, headers)) as ScanResult;
      setLast(result);
      setSession((s) => (s ? { ...s, total: result.total, checkedIn: result.checkedIn } : s));
      navigator.vibrate?.(result.result === "ok" ? 80 : [60, 60, 60]);
    } catch (err: any) {
      setError(err.message || "Check-in failed - check your connection");
    } finally {
      busy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pin, productId, user]);

  // Camera scanning once the session is open. The same code within a few
  // seconds is ignored, so holding a ticket up doesn't scan it repeatedly.
  useEffect(() => {
    if (!session || !videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      ({ data }) => {
        const code = data.trim();
        const now = Date.now();
        if (!code || (recent.current && recent.current.code === code && now - recent.current.at < 4000)) return;
        recent.current = { code, at: now };
        void submit(code);
      },
      { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 5 }
    );
    scanner.start().catch(() => setCameraError("Camera unavailable - allow camera access, or type the ticket code below."));
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [session !== null, submit]);

  const onManual = (e: FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      void submit(manualCode.trim());
      setManualCode("");
    }
  };

  const shell = (children: ReactNode) => (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f172a', color: 'white' }}>{children}</div>
  );

  if (!session) {
    return shell(
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xs text-center space-y-4">
          <Users className="h-10 w-10 mx-auto opacity-80" />
          <h1 className="text-xl font-bold">Event check-in</h1>
          {isDoor ? (
            <form onSubmit={(e) => { e.preventDefault(); void open(); }} className="space-y-3">
              <p className="text-sm opacity-80">Enter the 6-digit PIN the organizer gave you.</p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center text-2xl tracking-[0.4em] px-4 py-3 rounded-lg"
                style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }}
                aria-label="PIN"
              />
              <button
                type="submit"
                disabled={pin.length !== 6 || opening}
                className="w-full px-4 py-3 rounded-lg font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {opening ? "Opening…" : "Start scanning"}
              </button>
            </form>
          ) : opening ? (
            <p className="opacity-80">Opening scanner…</p>
          ) : null}
          {error && <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>}
          {error && !isDoor && !user && (
            <Link to="/login" className="inline-block underline">Log in</Link>
          )}
        </div>
      </div>
    );
  }

  const style = last ? RESULT_STYLE[last.result] : null;

  return shell(
    <>
      <header className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid #1e293b' }}>
        <div className="min-w-0">
          <p className="font-semibold truncate">{session.eventName}</p>
          <p className="text-xs opacity-70">{formatEventTime(session.startsAt)} WAT</p>
        </div>
        <p className="text-right flex-shrink-0">
          <span className="text-2xl font-bold">{session.checkedIn}</span>
          <span className="opacity-70"> / {session.total}</span>
          <span className="block text-[11px] opacity-70">checked in</span>
        </p>
      </header>

      <div className="relative bg-black" style={{ aspectRatio: '1 / 1', maxHeight: '60vh' }}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {cameraError && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm">{cameraError}</p>}
      </div>

      <div className="p-4 space-y-4 flex-1">
        {last && style && (
          <div className="rounded-xl p-4" style={{ backgroundColor: style.bg }} role="status" aria-live="assertive">
            <p className="flex items-center gap-2 text-lg font-bold">
              <style.Icon className="h-6 w-6" /> {style.title}
            </p>
            {last.ticket && (
              <p className="mt-1">
                <span className="text-xl font-semibold">{last.ticket.attendeeName}</span>
                <span className="opacity-80"> &middot; {last.ticket.tierName}</span>
              </p>
            )}
            {last.result === "already" && last.ticket?.checkedInAt && (
              <p className="text-sm opacity-90">At {formatEventTime(last.ticket.checkedInAt, false)}{last.checkedInBy ? ` by ${last.checkedInBy}` : ""}</p>
            )}
            {last.result === "wrong_event" && last.otherEvent && <p className="text-sm opacity-90">This ticket is for {last.otherEvent}.</p>}
            {session.organizer && last.ticket && (last.result === "ok" || last.result === "already") && (
              <button type="button" onClick={() => void submit(last.ticket!.code, true)} className="mt-2 text-sm underline">
                Undo this check-in
              </button>
            )}
          </div>
        )}
        {error && <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>}

        <form onSubmit={onManual} className="flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="Type a ticket code"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg font-mono tracking-wider"
            style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }}
            aria-label="Ticket code"
          />
          <button type="submit" className="px-4 py-2 rounded-lg font-semibold" style={{ backgroundColor: '#2563eb' }}>Check</button>
        </form>
      </div>
    </>
  );
}
