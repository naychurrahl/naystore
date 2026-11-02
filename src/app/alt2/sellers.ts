import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

export type SellerProfile = {
  merchantId: string; merchantName: string; slug: string; bio: string | null; state: string | null; area: string | null;
  bannerImage: string | null; sellerAvgRating: number | null; sellerReviewCount: number;
  productAvgRating: number | null; productReviewCount: number;
};

// Shop profiles (GET sellers/:slug), fetched once per shop per visit and
// shared by the homepage, filters, product pages and the cart.
const cache = new Map<string, SellerProfile | null>();
const pending = new Map<string, Promise<void>>();

function load(slug: string): Promise<void> {
  if (!pending.has(slug)) {
    pending.set(slug, apiFetch(`${API_BASE}/sellers/${slug}`)
      .then((p: SellerProfile) => { cache.set(slug, p); })
      .catch(() => { cache.set(slug, null); }));
  }
  return pending.get(slug)!;
}

export function useSellers(slugs: (string | null | undefined)[]): Map<string, SellerProfile | null> {
  const key = [...new Set(slugs.filter(Boolean) as string[])].sort().join(",");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    const missing = key.split(",").filter((s) => !cache.has(s));
    if (!missing.length) return;
    Promise.all(missing.map(load)).then(() => { if (live) setVersion((v) => v + 1); });
    return () => { live = false; };
  }, [key]);
  return useMemo(() => new Map(key ? key.split(",").map((s) => [s, cache.get(s) ?? null]) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, version]);
}
