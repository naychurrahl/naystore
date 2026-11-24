import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";

// A seller's delivery fees: zones (places, a fee, a delivery time), ending
// with "Everywhere else" - a fee, or "we don't deliver". Saved as a whole.
export type Place = { state: string; lga: string | null };
export type Zone = { name: string; fee: number | null; freeAbove: number | null; daysMin: number; daysMax: number; rest: boolean; places: Place[] };
type Table = { zones: Zone[]; saved: boolean; ready: boolean; states: Record<string, string[]> };

const ink = { primary: { color: "var(--color-text-primary)" }, secondary: { color: "var(--color-text-secondary)" }, muted: { color: "var(--color-text-muted)" } };
const field = "h-10 px-3 rounded-lg border bg-transparent text-sm";
const fieldStyle = { borderColor: "var(--color-border)", ...ink.primary };
const num = (v: string) => (v === "" ? null : Number(v));
export const placeLabel = (p: Place) => (p.lga ? `${p.lga}, ${p.state}` : p.state === "FCT" ? "Abuja (FCT)" : p.state);

function PlacePicker({ states, onAdd }: { states: Record<string, string[]>; onAdd: (p: Place) => void }) {
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <select aria-label="State" value={state} onChange={(e) => { setState(e.target.value); setLga(""); }} className={field} style={fieldStyle}>
        <option value="">Choose a state</option>
        {Object.keys(states).map((s) => <option key={s} value={s}>{s === "FCT" ? "Abuja (FCT)" : s}</option>)}
      </select>
      {state && (
        <select aria-label="LGA" value={lga} onChange={(e) => setLga(e.target.value)} className={field} style={fieldStyle}>
          <option value="">The whole state</option>
          {(states[state] ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      <button type="button" disabled={!state} onClick={() => { onAdd({ state, lga: lga || null }); setLga(""); }}
        className="h-10 px-3 rounded-lg border text-sm disabled:opacity-50 inline-flex items-center gap-1" style={fieldStyle}>
        <Plus className="h-4 w-4" aria-hidden /> Add place
      </button>
    </div>
  );
}

export function DeliveryTableEditor({ load, save }: { load: () => Promise<Table>; save: (zones: Zone[]) => Promise<Table> }) {
  const [table, setTable] = useState<Table | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().then((t) => { setTable(t); setZones(t.zones); }).catch((e: any) => setError(e.message || "Couldn't load your delivery fees"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!table) return <p className="text-sm" style={ink.muted}>{error ?? "Loading…"}</p>;
  const rest = zones[zones.length - 1];
  const areas = zones.slice(0, -1);
  const change = (i: number, patch: Partial<Zone>) => setZones(zones.map((z, n) => (n === i ? { ...z, ...patch } : z)));
  const taken = (p: Place) => zones.some((z) => z.places.some((q) => q.state === p.state && (q.lga ?? "") === (p.lga ?? "")));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await save(zones);
      setTable(t);
      setZones(t.zones);
      toast.success("Delivery fees saved");
    } catch (e: any) {
      setError(e.message || "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      {!table.ready && (
        <p className="p-3 rounded-lg text-sm" style={{ border: "1px solid var(--color-accent, var(--color-primary))", ...ink.secondary }}>
          Set at least one fee to take orders that need delivering. Buyers see your fee and delivery time before they pay.
        </p>
      )}
      {areas.map((z, i) => (
        <fieldset key={i} className="p-4 rounded-xl grid gap-3" style={{ border: "1px solid var(--color-border)" }}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm space-y-1 grow">
              <span className="block" style={ink.secondary}>Zone name</span>
              <input value={z.name} onChange={(e) => change(i, { name: e.target.value })} className={`${field} w-full`} style={fieldStyle} />
            </label>
            <label className="text-sm space-y-1">
              <span className="block" style={ink.secondary}>Fee (₦)</span>
              <input inputMode="decimal" value={z.fee ?? ""} onChange={(e) => change(i, { fee: num(e.target.value) })} className={`${field} w-28`} style={fieldStyle} />
            </label>
            <label className="text-sm space-y-1">
              <span className="block" style={ink.secondary}>Delivery time (days)</span>
              <span className="flex items-center gap-1">
                <input inputMode="numeric" aria-label="From days" value={z.daysMin} onChange={(e) => change(i, { daysMin: Number(e.target.value || 0) })} className={`${field} w-16`} style={fieldStyle} />
                <span style={ink.muted}>to</span>
                <input inputMode="numeric" aria-label="To days" value={z.daysMax} onChange={(e) => change(i, { daysMax: Number(e.target.value || 0) })} className={`${field} w-16`} style={fieldStyle} />
              </span>
            </label>
            <label className="text-sm space-y-1">
              <span className="block" style={ink.secondary}>Free above (₦, optional)</span>
              <input inputMode="decimal" value={z.freeAbove ?? ""} onChange={(e) => change(i, { freeAbove: num(e.target.value) })} className={`${field} w-32`} style={fieldStyle} />
            </label>
            <button type="button" aria-label={`Remove ${z.name || "zone"}`} onClick={() => setZones(zones.filter((_, n) => n !== i))}
              className="h-10 w-10 rounded-lg border inline-flex items-center justify-center" style={fieldStyle}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {z.places.map((p, n) => (
              <span key={n} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ border: "1px solid var(--color-border)", ...ink.primary }}>
                {placeLabel(p)}
                <button type="button" aria-label={`Remove ${placeLabel(p)}`} onClick={() => change(i, { places: z.places.filter((_, k) => k !== n) })}><X className="h-3 w-3" aria-hidden /></button>
              </span>
            ))}
            {z.places.length === 0 && <span className="text-xs" style={ink.muted}>No places yet.</span>}
          </div>
          <PlacePicker states={table.states} onAdd={(p) => {
            if (taken(p)) { toast.error(`${placeLabel(p)} is already in a zone`); return; }
            change(i, { places: [...z.places, p] });
          }} />
        </fieldset>
      ))}
      <div>
        <button type="button" onClick={() => setZones([...areas, { name: "", fee: null, freeAbove: null, daysMin: 1, daysMax: 3, rest: false, places: [] }, rest])}
          className="h-10 px-4 rounded-lg border text-sm inline-flex items-center gap-1" style={fieldStyle}>
          <Plus className="h-4 w-4" aria-hidden /> Add a zone
        </button>
      </div>
      {rest && (
        <fieldset className="p-4 rounded-xl grid gap-3" style={{ border: "1px solid var(--color-border)" }}>
          <legend className="px-1 text-sm font-semibold" style={ink.primary}>Everywhere else</legend>
          <label className="flex items-center gap-2 text-sm" style={ink.primary}>
            <input type="checkbox" checked={rest.fee === null} onChange={(e) => change(zones.length - 1, { fee: e.target.checked ? null : 0 })} />
            We don't deliver anywhere else
          </label>
          {rest.fee !== null && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm space-y-1">
                <span className="block" style={ink.secondary}>Fee (₦)</span>
                <input inputMode="decimal" value={rest.fee ?? ""} onChange={(e) => change(zones.length - 1, { fee: num(e.target.value) ?? 0 })} className={`${field} w-28`} style={fieldStyle} />
              </label>
              <label className="text-sm space-y-1">
                <span className="block" style={ink.secondary}>Delivery time (days)</span>
                <span className="flex items-center gap-1">
                  <input inputMode="numeric" aria-label="From days" value={rest.daysMin} onChange={(e) => change(zones.length - 1, { daysMin: Number(e.target.value || 0) })} className={`${field} w-16`} style={fieldStyle} />
                  <span style={ink.muted}>to</span>
                  <input inputMode="numeric" aria-label="To days" value={rest.daysMax} onChange={(e) => change(zones.length - 1, { daysMax: Number(e.target.value || 0) })} className={`${field} w-16`} style={fieldStyle} />
                </span>
              </label>
            </div>
          )}
        </fieldset>
      )}
      {error && <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
      <div>
        <button type="submit" disabled={busy} className="h-10 px-5 rounded-lg font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, var(--color-primary-ink, #fff))" }}>
          {busy ? "Saving…" : "Save delivery fees"}
        </button>
      </div>
    </form>
  );
}

// Shown to buyers: a shop's zones, fee and time.
export function DeliveryZonesList({ zones }: { zones?: Zone[] | null }) {
  if (!zones?.length) return null;
  const days = (z: Zone) => (z.daysMax === 0 ? "same day" : z.daysMin === z.daysMax ? `${z.daysMax} day${z.daysMax === 1 ? "" : "s"}` : `${z.daysMin}-${z.daysMax} days`);
  const money = (n: number) => (n === 0 ? "Free" : `₦${n.toLocaleString()}`);
  return (
    <section className="grid gap-2">
      <h2 className="font-semibold" style={ink.primary}>Delivery</h2>
      <ul className="grid gap-1 text-sm" style={ink.secondary}>
        {zones.map((z, i) => (
          <li key={i}>
            <strong style={ink.primary}>{z.rest ? "Everywhere else" : z.name}</strong>
            {!z.rest && z.places.length > 0 && <> ({z.places.map(placeLabel).join(", ")})</>}
            {": "}{z.fee === null ? "no delivery" : `${money(z.fee)}, ${days(z)}`}
            {z.freeAbove !== null && z.fee !== null && z.fee > 0 && <>, free above ₦{z.freeAbove.toLocaleString()}</>}
          </li>
        ))}
      </ul>
    </section>
  );
}

