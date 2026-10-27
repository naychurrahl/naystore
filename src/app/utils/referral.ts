// An invite link (?ref=CODE) is remembered for 30 days, so the code is still
// filled in when the friend signs up later. Storage can be blocked - then
// the friend types the code themselves.
const KEY = "naychurrahl_ref";
const DAYS = 30;

export function rememberReferral(search: string) {
  const code = new URLSearchParams(search).get("ref")?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9]{4,12}$/.test(code)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, until: Date.now() + DAYS * 86400000 }));
  } catch {
    // ignore
  }
}

export function savedReferral(): string {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && saved.until > Date.now()) return saved.code;
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  return "";
}

export function forgetReferral() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
