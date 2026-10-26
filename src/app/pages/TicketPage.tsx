import { Link, useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, CalendarPlus, CheckCircle2, Globe, MapPin, ShieldAlert } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { formatEventRange, formatEventTime } from "../utils/eventTime";

interface TicketData {
  code: string;
  attendeeName: string;
  tierName: string;
  checkedInAt: string | null;
  valid: boolean;
  productId: string;
  eventName: string;
  organizer: string;
  event: {
    startsAt: string;
    endsAt: string | null;
    locationType: "venue" | "online";
    venueName: string | null;
    venueAddress: string | null;
    onlineUrl: string | null;
    accessNotes: string | null;
    ended: boolean;
  };
}

// 10-character codes read more easily as ABCDE-FGHJK.
const formatCode = (code: string) => `${code.slice(0, 5)}-${code.slice(5)}`;

// One attendee's ticket: the QR the door staff scan, plus when/where. The
// code in the address is the ticket, so this page needs no login.
export function TicketPage() {
  const { code = "" } = useParams();
  const { data, loading, error } = useAPI(`${API_BASE}/tickets/${encodeURIComponent(code)}`);
  const ticket = data as TicketData | null;

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><p style={{ color: 'var(--color-text-secondary)' }}>Loading ticket…</p></div>;
  }

  if (error || !ticket) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-error)' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Ticket not found</h1>
          <p className="mb-5" style={{ color: 'var(--color-text-secondary)' }}>Check the link in your ticket email, or open your Library.</p>
          <Link to="/library" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>Go to my Library</Link>
        </div>
      </div>
    );
  }

  const { event } = ticket;

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-md mx-auto rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
        <div className="p-5 text-center" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
          <p className="text-xs uppercase tracking-wider opacity-80">{ticket.tierName} ticket</p>
          <h1 className="text-xl font-bold mt-1">{ticket.eventName}</h1>
          <p className="text-sm opacity-90 mt-1">by {ticket.organizer}</p>
        </div>

        <div className="p-6 flex flex-col items-center gap-3">
          {!ticket.valid ? (
            <p className="w-full p-3 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--color-error-light)', color: 'var(--color-error)' }}>
              <ShieldAlert className="h-5 w-5" /> This ticket is no longer valid (the order was cancelled).
            </p>
          ) : ticket.checkedInAt ? (
            <p className="w-full p-3 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
              <CheckCircle2 className="h-5 w-5" /> Checked in {formatEventTime(ticket.checkedInAt)}
            </p>
          ) : null}

          <div className={`p-3 rounded-xl bg-white ${ticket.valid ? "" : "opacity-30"}`}>
            <QRCodeSVG value={ticket.code} size={220} level="M" marginSize={1} />
          </div>
          <p className="font-mono text-lg tracking-widest" style={{ color: 'var(--color-text-primary)' }}>{formatCode(ticket.code)}</p>
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{ticket.attendeeName}</p>
          {ticket.valid && !ticket.checkedInAt && (
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              Show this QR code at the door. Turn your screen brightness up.
            </p>
          )}
        </div>

        <div className="px-6 pb-6 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="flex items-start gap-2"><CalendarDays className="h-4 w-4 mt-0.5 flex-shrink-0" /> {formatEventRange(event.startsAt, event.endsAt)}</p>
          {event.locationType === "online" ? (
            <p className="flex items-start gap-2 min-w-0">
              <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <a href={event.onlineUrl ?? "#"} target="_blank" rel="noreferrer" className="font-medium hover:underline break-all" style={{ color: 'var(--color-primary)' }}>
                {event.onlineUrl}
              </a>
            </p>
          ) : (
            <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" /> {[event.venueName, event.venueAddress].filter(Boolean).join(", ")}</p>
          )}
          {event.accessNotes && (
            <p className="pt-2 whitespace-pre-line" style={{ borderTop: '1px solid var(--color-border)' }}>{event.accessNotes}</p>
          )}
          {!event.ended && ticket.valid && (
            <a
              href={`${API_BASE}/tickets/${encodeURIComponent(ticket.code)}/calendar`}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <CalendarPlus className="h-4 w-4" /> Add to calendar
            </a>
          )}
        </div>
      </div>
      <p className="text-center mt-4 text-sm">
        <Link to="/library" className="hover:underline" style={{ color: 'var(--color-primary)' }}>My Library</Link>
      </p>
    </div>
  );
}
