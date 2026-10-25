// Lesson/course lengths: 0:45, 12:05, 1h 20m.
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
