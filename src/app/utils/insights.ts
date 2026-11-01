import { API_BASE } from "./apiBase.js";

// Shop insights (backend data/Insights.php): tells the API when someone
// visits a shop, views a product, adds to cart or starts checkout. Only
// counts are kept - see the backend for what's stored.
//
// Where people came from is worked out once per visit (browser tab): the
// site that sent them (the referrer's host only, never the full address) and
// whether they arrived on an invite link (?ref=). The first page carries
// that; pages they browse to afterwards count as "browsing the store". Cart
// and checkout carry the visit's own source, so a sale traces back to what
// brought the buyer in.
//
// A merchant's promo link is a tag on their normal links (?promo=CODE). The
// code is kept for the visit and sent with every event and the order; the
// API only counts it for that merchant's own shop and products.

type Event = "visit" | "view" | "cart" | "checkout";
type Landing = { from: string; ref: boolean; promo: string; path: string };

const VISITOR_KEY = "naychurrahl_visitor";
const LANDING_KEY = "naychurrahl_landing";

let token: string | null = null;
// Set by AuthContext, so a merchant's own visits and the team's aren't counted.
export function setInsightToken(next: string | null) {
  token = next;
}

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

// This visit's landing: worked out on the first call, then kept for the tab.
let memoryLanding: Landing | null = null;
function landing(): Landing {
  try {
    const saved = sessionStorage.getItem(LANDING_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // fall through
  }
  if (memoryLanding) return memoryLanding;
  let from = "";
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    from = host === window.location.hostname ? "" : host;
  } catch {
    // no usable referrer
  }
  const params = new URLSearchParams(window.location.search);
  const promo = (params.get("promo") ?? "").trim().toUpperCase();
  const next = { from, ref: params.has("ref"), promo: /^[A-Z0-9]{4,16}$/.test(promo) ? promo : "", path: window.location.pathname };
  memoryLanding = next;
  try {
    sessionStorage.setItem(LANDING_KEY, JSON.stringify(next));
  } catch {
    // kept in memory for this page
  }
  return next;
}

// The promo code this visit arrived with, for the order ("" for none).
export function landingPromo(): string {
  return landing().promo ?? "";
}

export function trackInsight(event: Event, ids: string | (string | null | undefined)[] | null | undefined) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter((id): id is string => !!id);
  if (!list.length || !API_BASE) return;
  const land = landing();
  // Views and visits after the landing page were found by browsing the store.
  const browsed = (event === "visit" || event === "view") && window.location.pathname !== land.path;
  const body = {
    event,
    ids: [...new Set(list)].slice(0, 50),
    from: browsed ? "" : land.from,
    ref: !browsed && land.ref,
    internal: browsed,
    ...(land.promo ? { promo: land.promo } : {}),
    visitor: visitorId(),
  };
  fetch(`${API_BASE}/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }).catch(() => {
    // Counting is best effort; the shopper never sees it.
  });
}
