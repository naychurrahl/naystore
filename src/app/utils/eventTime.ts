// Event times are set and shown in Lagos time (WAT), whatever the viewer's
// own timezone - a ticket says when to be at the door, not "your local time".
const TZ = "Africa/Lagos";

export function formatEventTime(iso: string, withDate = true): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ,
    ...(withDate ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// "Sat, 1 Nov 2026, 6:00 PM – 9:00 PM WAT" (the end shows its date only when
// the event runs past midnight).
export function formatEventRange(startsAt: string, endsAt?: string | null): string {
  const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
  const start = formatEventTime(startsAt);
  if (!endsAt) return `${start} WAT`;
  return `${start} – ${formatEventTime(endsAt, day(endsAt) !== day(startsAt))} WAT`;
}
