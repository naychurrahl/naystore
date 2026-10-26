import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Download, Pencil, Plus, QrCode, RefreshCw, Trash2, Users, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface EventDetails {
  startsAt: string;
  endsAt: string;
  locationType: "venue" | "online";
  venueName: string;
  venueAddress: string;
  onlineUrl: string;
  accessNotes: string;
  salesCloseAt: string;
}

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number | null;
  sold: number;
  remaining: number | null;
}

interface BuilderEvent {
  productId: string;
  name: string;
  visible: boolean;
  event: EventDetails | null;
  checkin: { doorUrl: string; pin: string } | null;
  tiers: Tier[];
  stats: { total: number; checkedIn: number };
}

interface Attendee {
  code: string;
  attendeeName: string;
  tierName: string;
  checkedInAt: string | null;
  attendeeEmail: string | null;
  buyerEmail: string;
  orderId: string;
  checkedInBy: string | null;
  valid: boolean;
}

type TierDraft = { name: string; price: string; capacity: string; description: string };

const blankEvent: EventDetails = {
  startsAt: "", endsAt: "", locationType: "venue", venueName: "", venueAddress: "", onlineUrl: "", accessNotes: "", salesCloseAt: "",
};
const blankTier: TierDraft = { name: "", price: "", capacity: "", description: "" };

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-xl p-4 space-y-4" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</span>}
    </label>
  );
}

function csvCell(value: string | null): string {
  const s = value ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Event setup for one ticket product: when/where, ticket types, the
// door-staff check-in link and the attendee list. Every call answers with
// the whole event, so the screen just replaces its state.
export function EventBuilder({ productId, scannerHref }: { productId: string; scannerHref: string }) {
  const { authHeader } = useAuth();
  const opts = { headers: authHeader };
  const url = (path = "") => `${API_BASE}/event-builder${path}`;
  const { data, loading, error: loadError } = useAPI(`${url()}?productId=${encodeURIComponent(productId)}`, opts);

  const [built, setBuilt] = useState<BuilderEvent | null>(null);
  const [details, setDetails] = useState<EventDetails>(blankEvent);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [newTier, setNewTier] = useState<TierDraft>(blankTier);
  const [editing, setEditing] = useState<{ id: string; draft: TierDraft } | null>(null);
  const [attendees, setAttendees] = useState<Attendee[] | null>(null);
  const [copied, setCopied] = useState(false);

  const apply = (next: BuilderEvent) => {
    setBuilt(next);
    if (next.event) setDetails(next.event);
  };
  useEffect(() => {
    if (data) apply(data as BuilderEvent);
  }, [data]);

  const call = async (request: Promise<any>): Promise<boolean> => {
    setError(null);
    try {
      apply((await request) as BuilderEvent);
      return true;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      return false;
    }
  };

  if (loading && !built) return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading event…</p>;
  if (loadError && !built) return <p className="text-sm" style={{ color: 'var(--color-error)' }}>{(loadError as any).message || "Could not load the event"}</p>;
  if (!built) return null;

  const set = (patch: Partial<EventDetails>) => setDetails((d) => ({ ...d, ...patch }));
  const tierBody = (d: TierDraft) => ({ name: d.name, price: d.price, capacity: d.capacity === "" ? null : d.capacity, description: d.description });
  const draftOf = (t: Tier): TierDraft => ({ name: t.name, price: String(t.price), capacity: t.capacity === null ? "" : String(t.capacity), description: t.description });

  const saveDetails = async () => {
    setSaving(true);
    if (await call(api.put(url("/event"), { productId, ...details }, opts))) setSavedAt(Date.now());
    setSaving(false);
  };

  const loadAttendees = async () => {
    setError(null);
    try {
      setAttendees(await api.get(`${url("/attendees")}?productId=${encodeURIComponent(productId)}`, opts));
    } catch (err: any) {
      setError(err.message || "Could not load attendees");
    }
  };

  const downloadCsv = () => {
    if (!attendees) return;
    const rows = [
      ["Name", "Ticket type", "Code", "Attendee email", "Buyer email", "Order", "Checked in", "Status"],
      ...attendees.map((a) => [a.attendeeName, a.tierName, a.code, a.attendeeEmail, a.buyerEmail, a.orderId, a.checkedInAt ?? "", a.valid ? "valid" : "cancelled"]),
    ];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendees-${productId}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const inputClass = "w-full";

  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{built.name}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {built.tiers.length} ticket type{built.tiers.length === 1 ? "" : "s"} · {built.stats.total} ticket{built.stats.total === 1 ? "" : "s"} issued
          {!built.visible && " · hidden from the shop"}
        </p>
        {(!built.event || built.tiers.length === 0) && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Tickets go on sale once the event details are saved and there's at least one ticket type.
          </p>
        )}
      </div>
      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

      <Section title="When & where">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Starts" hint="Lagos time (WAT)">
            <Input type="datetime-local" className={inputClass} value={details.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
          </Field>
          <Field label="Ends (optional)">
            <Input type="datetime-local" className={inputClass} value={details.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label="Event location" style={{ color: 'var(--color-text-primary)' }}>
          {(["venue", "online"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input type="radio" name="locationType" checked={details.locationType === type} onChange={() => set({ locationType: type })} />
              {type === "venue" ? "At a venue" : "Online"}
            </label>
          ))}
        </div>

        {details.locationType === "venue" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Venue name">
              <Input className={inputClass} placeholder="e.g. Transcorp Hilton, Congress Hall" value={details.venueName} onChange={(e) => set({ venueName: e.target.value })} />
            </Field>
            <Field label="Address">
              <Input className={inputClass} placeholder="Street, area, city" value={details.venueAddress} onChange={(e) => set({ venueAddress: e.target.value })} />
            </Field>
          </div>
        ) : (
          <Field label="Online link" hint="Zoom, Google Meet, YouTube… Only ticket holders see it.">
            <Input className={inputClass} placeholder="https://" value={details.onlineUrl} onChange={(e) => set({ onlineUrl: e.target.value })} />
          </Field>
        )}

        <Field label="Notes for ticket holders (optional)" hint="Shown on tickets and in the reminder: gate number, parking, dress code, meeting passcode…">
          <Textarea rows={2} value={details.accessNotes} onChange={(e) => set({ accessNotes: e.target.value })} />
        </Field>

        <Field label="Sales close (optional)" hint="Leave empty to sell until the event starts.">
          <Input type="datetime-local" className={inputClass} value={details.salesCloseAt} onChange={(e) => set({ salesCloseAt: e.target.value })} />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="button" disabled={saving || !details.startsAt} onClick={() => void saveDetails()}>
            {saving ? "Saving…" : built.event ? "Save details" : "Save event"}
          </Button>
          {savedAt && <span className="text-xs" style={{ color: 'var(--color-success)' }}>Saved</span>}
        </div>
      </Section>

      <Section title="Ticket types">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          The shop shows the cheapest as "from ₦…". Leave capacity empty for unlimited. Buyers can get up to 10 of a type per order.
        </p>
        <ul className="space-y-2">
          {built.tiers.map((tier) => editing?.id === tier.id ? (
            <li key={tier.id} className="p-3 rounded-lg space-y-2" style={{ border: '1px solid var(--color-primary)' }}>
              <TierFields draft={editing.draft} onChange={(draft) => setEditing({ id: tier.id, draft })} />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => void call(api.put(url("/tier"), { id: tier.id, ...tierBody(editing.draft) }, opts)).then((ok) => ok && setEditing(null))}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </li>
          ) : (
            <li key={tier.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg text-sm" style={{ border: '1px solid var(--color-border)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{tier.name} · ₦{tier.price}</p>
                {tier.description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tier.description}</p>}
              </div>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {tier.sold} sold{tier.capacity !== null ? ` of ${tier.capacity}` : ""}
                {tier.remaining === 0 && <strong style={{ color: 'var(--color-error)' }}> · sold out</strong>}
              </span>
              <button type="button" aria-label={`Edit ${tier.name}`} onClick={() => setEditing({ id: tier.id, draft: draftOf(tier) })} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${tier.name}`}
                onClick={() => { if (confirm(`Delete the "${tier.name}" ticket type?`)) void call(api.delete(url(`/tier/${encodeURIComponent(tier.id)}`), opts)); }}
                className="p-1"
                style={{ color: 'var(--color-error)' }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="p-3 rounded-lg space-y-2" style={{ border: '1px dashed var(--color-border)' }}>
          <TierFields draft={newTier} onChange={setNewTier} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!newTier.name.trim() || !newTier.price}
            onClick={() => void call(api.post(url("/tier"), { productId, ...tierBody(newTier) }, opts)).then((ok) => ok && setNewTier(blankTier))}
          >
            <Plus className="h-4 w-4 mr-1" /> Add ticket type
          </Button>
        </div>
      </Section>

      {built.checkin && (
        <Section
          title="Check-in"
          aside={<span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{built.stats.checkedIn} of {built.stats.total} checked in</span>}
        >
          <a
            href={scannerHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <QrCode className="h-4 w-4" /> Open the scanner
          </a>
          <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p>
              <strong style={{ color: 'var(--color-text-primary)' }}>Door staff</strong> don't need an account: send them this link and PIN.
              They can check people in, but can't undo check-ins or see the attendee list.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="px-2 py-1 rounded text-xs break-all" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {built.checkin.doorUrl}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(`${built.checkin!.doorUrl}\nPIN: ${built.checkin!.pin}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> {copied ? "Copied" : "Copy link + PIN"}
              </Button>
            </div>
            <p>PIN: <span className="font-mono text-base tracking-widest" style={{ color: 'var(--color-text-primary)' }}>{built.checkin.pin}</span></p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm"
              style={{ color: 'var(--color-error)' }}
              onClick={() => {
                if (confirm("Make a new door link and PIN? The old ones stop working immediately.")) {
                  void call(api.post(url("/checkin-reset"), { productId }, opts));
                }
              }}
            >
              <RefreshCw className="h-4 w-4" /> Reset link and PIN
            </button>
          </div>
        </Section>
      )}

      <Section
        title="Attendees"
        aside={
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void loadAttendees()}>
              <Users className="h-4 w-4 mr-1" /> {attendees ? "Refresh" : "Show attendees"}
            </Button>
            {attendees && attendees.length > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={downloadCsv}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            )}
          </div>
        }
      >
        {attendees && attendees.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No tickets sold yet.</p>
        )}
        {attendees && attendees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: 'var(--color-text-muted)' }}>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.code} style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <td className="py-2 pr-3" style={{ color: 'var(--color-text-primary)' }}>{a.attendeeName}</td>
                    <td className="py-2 pr-3">{a.tierName}</td>
                    <td className="py-2 pr-3 break-all">{a.attendeeEmail ?? a.buyerEmail}</td>
                    <td className="py-2">
                      {!a.valid ? <span style={{ color: 'var(--color-error)' }}>Cancelled</span>
                        : a.checkedInAt ? <span style={{ color: 'var(--color-success)' }}>Checked in</span>
                        : "Not yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function TierFields({ draft, onChange }: { draft: TierDraft; onChange: (draft: TierDraft) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
      <Input placeholder="Name, e.g. Regular, VIP, Early bird" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      <Input type="number" min={1} placeholder="Price (₦)" value={draft.price} onChange={(e) => onChange({ ...draft, price: e.target.value })} />
      <Input type="number" min={1} placeholder="Capacity" value={draft.capacity} onChange={(e) => onChange({ ...draft, capacity: e.target.value })} />
      <Input className="sm:col-span-3" placeholder="What's included (optional)" value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} />
    </div>
  );
}
