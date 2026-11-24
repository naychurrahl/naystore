import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import PaystackPop from "@paystack/inline-js";
import { Megaphone } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

type Placement = { id: string; label: string; slots: number; dayPrice: number; forSale: boolean; auctionSlots: number; minBid: number };
// A bundle bought at checkout (a service): promotion days to book here.
type Bundle = {
  id: string; name: string; summary: string; boughtAt: string; days: Record<string, number>; daysLeft: Record<string, number>;
  bookFrom: string | null; bookUntil: string | null; setup: boolean; setupStatus: string;
};
type Bid = {
  id: string; title: string; amount: number; state: string; payBy: string | null; weekStart: string; weekEnd: string; closesAt: string;
  fees: { paystack: number; naylet: number };
};
type Round = { weekStart: string; weekEnd: string; closesAt: string };
type Promotion = {
  id: string; placement: string; title: string; state: string; startsOn: string; endsOn: string; days: number; source: string;
  amount: number; fee: number; paymentProvider: string; refunded: number | null; refundStatus: string | null;
};
// A shop that joined with a referral code: free days in Featured shops.
type FreeDays = { days: number; bookBy: string; state: "locked" | "ready" | "used" | "expired"; offer?: string | null };
type Product = { id: string; name: string; categories?: string[]; visible?: boolean; inStock?: boolean };
type Quote = { days: number; amount: number; fee: number; total: number; fullDays: string[]; clash: boolean };

const paystack = new PaystackPop();
const NAYLET_WAIT_MS = 15 * 60 * 1000;

const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const longDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
// "2026-11-08 18:00:00" → "6pm".
const clockHour = (at: string) => { const h = Number(at.slice(11, 13)); return `${h % 12 || 12}${h < 12 ? "am" : "pm"}`; };

const card = { backgroundColor: "var(--color-product-card, var(--color-card))", border: "1px solid var(--color-border)" };
const ink = { primary: { color: "var(--color-text-primary)" }, secondary: { color: "var(--color-text-secondary)" }, muted: { color: "var(--color-text-muted)" } };
const input = { borderColor: "var(--color-border)", ...ink.primary };

const BID_LABEL: Record<string, [string, string]> = {
  open: ["Bidding open", "var(--color-primary)"],
  won: ["You won: pay to confirm", "var(--color-success)"],
  paid: ["Paid", "var(--color-success)"],
  waiting: ["Didn't win this time", "var(--color-text-secondary)"],
  lost: ["Didn't win", "var(--color-text-muted)"],
  unpaid: ["Not paid in time", "var(--color-error)"],
};

const WHAT_YOU_GET: Record<string, string> = {
  featured_shop: "Your shop's card in Featured shops on the home page.",
  product: "One product in the home page's product sections.",
  category: "One product first on its category page, and its picture can show on that category's tile.",
};

const STATE_LABEL: Record<string, [string, string]> = {
  awaiting_payment: ["Waiting for payment", "var(--color-text-secondary)"],
  expired: ["Not paid, dates released", "var(--color-text-muted)"],
  failed: ["Payment failed", "var(--color-error)"],
  scheduled: ["Booked", "var(--color-primary)"],
  running: ["Running now", "var(--color-success)"],
  ended: ["Ended", "var(--color-text-muted)"],
  stopped: ["Stopped", "var(--color-error)"],
};

// Free days in Featured shops: a referred shop's (source referral), or a
// founding or early shop's (source offer). Unlocked by the first delivered
// sale, booked once.
function FreeDaysBox({ free, source, today, lastStart, onBooked }: {
  free: FreeDays; source: "referral" | "offer"; today: string; lastStart: string; onBooked: () => void;
}) {
  const { authHeader } = useAuth();
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (free.state !== "ready" && free.state !== "locked") return null;
  const why = source === "offer" ? `You're a ${free.offer ?? "founding shop"}` : "You joined with a referral code";
  const book = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`${API_BASE}/my-promotions/free`, { startsOn: start, source }, { headers: authHeader });
      toast.success("Your free days are booked");
      setStart("");
      onBooked();
    } catch (e: any) {
      setErr(e.message || "Your free days couldn't be booked");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="p-5 rounded-xl grid gap-3" style={{ ...card, borderColor: "var(--color-primary)" }} onSubmit={(e) => { e.preventDefault(); void book(); }}>
      <div>
        <h2 className="font-semibold" style={ink.primary}>{free.days} free days in Featured shops</h2>
        <p className="text-sm mt-1" style={ink.secondary}>
          {free.state === "ready"
            ? `${why}, so your shop's card can show in Featured shops on the home page for ${free.days} days, free.`
            : `${why}. Once your first sale is delivered, your shop's card can show in Featured shops on the home page for free.`}{" "}
          Book them by {longDate(free.bookBy.slice(0, 10))}, on dates that still have a place.
        </p>
      </div>
      {free.state === "ready" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm space-y-1 block">
            <span style={ink.secondary}>First day</span>
            <input type="date" value={start} min={today} max={lastStart} onChange={(e) => setStart(e.target.value)}
              className="h-10 px-3 rounded-lg border bg-transparent" style={input} />
          </label>
          <button type="submit" disabled={!start || busy} className="h-10 px-5 rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, var(--color-primary-ink, #fff))" }}>
            {busy ? "Booking…" : "Book my free days"}
          </button>
        </div>
      )}
      {err && <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>{err}</p>}
    </form>
  );
}

// A bought bundle's days: pick a place, how many days, a product (and
// category) where needed, and the first day. Nothing to pay: it was paid at
// checkout. Days can be split over several bookings.
const BUNDLE_PLACE: Record<string, string> = { featured_shop: "Featured shop", product: "Home page product", category: "Category placement" };

function BundleDays({ bundle, products, allCategories, today, lastStart, onBooked }: {
  bundle: Bundle; products: Product[]; allCategories: { id: string; name: string }[]; today: string; lastStart: string; onBooked: () => void;
}) {
  const { authHeader } = useAuth();
  const places = (["featured_shop", "product", "category"] as const).filter((p) => (bundle.daysLeft[p] ?? 0) > 0);
  const [place, setPlace] = useState<string>(places[0] ?? "");
  const [days, setDays] = useState(String(bundle.daysLeft[places[0]] ?? 1));
  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const left = bundle.daysLeft[place] ?? 0;
  const needsProduct = place === "product" || place === "category";
  const product = products.find((p) => p.id === productId);
  const categories = allCategories.filter((c) => product?.categories?.includes(c.name));
  const min = bundle.bookFrom && bundle.bookFrom > today ? bundle.bookFrom : today;
  const max = bundle.bookUntil && bundle.bookUntil < lastStart ? bundle.bookUntil : lastStart;
  const ready = place && startsOn && Number(days) >= 1 && Number(days) <= left && (!needsProduct || productId) && (place !== "category" || categoryId);

  const book = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`${API_BASE}/my-promotions/from-grant`, {
        grantId: bundle.id, placement: place, days: Number(days), startsOn,
        ...(needsProduct ? { productId } : {}), ...(place === "category" ? { categoryId } : {}),
      }, { headers: authHeader });
      toast.success("Your days are booked");
      setStartsOn("");
      onBooked();
    } catch (e: any) {
      setErr(e.message || "Those days couldn't be booked");
    } finally {
      setBusy(false);
    }
  };

  const windowText = bundle.bookFrom || bundle.bookUntil
    ? ` They can run ${bundle.bookFrom ? `from ${longDate(bundle.bookFrom)} ` : ""}${bundle.bookUntil ? `until ${longDate(bundle.bookUntil)}` : ""}.`
    : "";

  return (
    <form className="p-5 rounded-xl grid gap-3" style={{ ...card, borderColor: "var(--color-primary)" }} onSubmit={(e) => { e.preventDefault(); if (ready) void book(); }}>
      <div>
        <h2 className="font-semibold" style={ink.primary}>Your {bundle.name}: days to book</h2>
        <p className="text-sm mt-1" style={ink.secondary}>
          {places.map((p) => `${bundle.daysLeft[p]} ${BUNDLE_PLACE[p]} ${bundle.daysLeft[p] === 1 ? "day" : "days"}`).join(", ")} left.{windowText}
          {" "}Already paid for. Choose dates that still have a place.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm space-y-1 block">
          <span style={ink.secondary}>Where</span>
          <select value={place} onChange={(e) => { setPlace(e.target.value); setDays(String(bundle.daysLeft[e.target.value] ?? 1)); setCategoryId(""); }}
            className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
            {places.map((p) => <option key={p} value={p}>{BUNDLE_PLACE[p]}</option>)}
          </select>
        </label>
        <label className="text-sm space-y-1 block">
          <span style={ink.secondary}>How many days (up to {left})</span>
          <input type="number" min={1} max={left} value={days} onChange={(e) => setDays(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input} />
        </label>
        {needsProduct && (
          <label className="text-sm space-y-1 block">
            <span style={ink.secondary}>Which product?</span>
            <select value={productId} onChange={(e) => { setProductId(e.target.value); setCategoryId(""); }} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
              <option value="">Choose a product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
        {place === "category" && productId && (
          <label className="text-sm space-y-1 block">
            <span style={ink.secondary}>Which category?</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
              <option value="">Choose a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="text-sm space-y-1 block">
          <span style={ink.secondary}>First day</span>
          <input type="date" value={startsOn} min={min} max={max} onChange={(e) => setStartsOn(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input} />
        </label>
      </div>
      <div>
        <button type="submit" disabled={!ready || busy} className="h-10 px-5 rounded-lg font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, var(--color-primary-ink, #fff))" }}>
          {busy ? "Booking…" : "Book these days"}
        </button>
      </div>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>{err}</p>}
    </form>
  );
}

// A shop buys a place on the home page: where, what, which dates, then pays.
export function MerchantPromotionsPage() {
  const { authHeader } = useAuth();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [bidBlocked, setBidBlocked] = useState(false);
  const [bidPlacement, setBidPlacement] = useState("");
  const [bidProduct, setBidProduct] = useState("");
  const [bidCategory, setBidCategory] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [freeDays, setFreeDays] = useState<FreeDays | null>(null);
  const [offerDays, setOfferDays] = useState<FreeDays | null>(null);
  const [limits, setLimits] = useState({ today: "", maxDays: 31, bookAheadDays: 90 });
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [placement, setPlacement] = useState("");
  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [provider, setProvider] = useState<"paystack" | "naylet">("paystack");

  const [fullDates, setFullDates] = useState<string[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);
  const [error, setError] = useState<{ text: string; connect?: boolean } | null>(null);
  const stopWaiting = useRef(false);

  const applyBids = (res: any) => {
    setBids(res.bids);
    setRound(res.round);
    setBidBlocked(res.blocked);
  };
  const load = () => Promise.all([
    api.get(`${API_BASE}/my-promotions`, { headers: authHeader }).then((res: any) => {
      setPromotions(res.promotions);
      setPlacements(res.placements);
      setBundles(res.bundles ?? []);
      setFreeDays(res.freeDays ?? null);
      setOfferDays(res.offerDays ?? null);
      setLimits({ today: res.today, maxDays: res.maxDays, bookAheadDays: res.bookAheadDays });
    }),
    api.get(`${API_BASE}/my-promotions/bids`, { headers: authHeader }).then(applyBids),
  ]);

  useEffect(() => {
    Promise.all([
      load(),
      api.get(`${API_BASE}/my-products`, { headers: authHeader }).then((rows: any) => setProducts(rows ?? [])).catch(() => {}),
      api.get(`${API_BASE}/categories?type=product`).then((rows: any) => setAllCategories(rows ?? [])).catch(() => {}),
    ]).catch((err: any) => toast.error(err.message || "Couldn't load promotions")).finally(() => setLoading(false));
    return () => { stopWaiting.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const forSale = placements.filter((p) => p.forSale);
  const chosen = placements.find((p) => p.id === placement);
  const biddable = placements.filter((p) => p.auctionSlots > 0);
  const bidPlace = biddable.find((p) => p.id === bidPlacement);
  const bidNeedsProduct = bidPlacement === "product" || bidPlacement === "category";
  const bidCategories = useMemo(() => {
    const names = products.find((p) => p.id === bidProduct)?.categories ?? [];
    return allCategories.filter((c) => names.includes(c.name));
  }, [allCategories, products, bidProduct]);
  const needsProduct = placement === "product" || placement === "category";
  const sellable = useMemo(() => products.filter((p) => p.visible !== false && p.inStock !== false), [products]);
  const product = products.find((p) => p.id === productId);
  const categories = useMemo(() => allCategories.filter((c) => product?.categories?.includes(c.name)), [allCategories, product]);
  const lastStart = useMemo(() => {
    if (!limits.today) return "";
    const d = new Date(`${limits.today}T12:00:00`);
    d.setDate(d.getDate() + limits.bookAheadDays);
    return d.toISOString().slice(0, 10);
  }, [limits]);

  // Days this place has no room on.
  useEffect(() => {
    setFullDates([]);
    if (!placement || (placement === "category" && !categoryId)) return;
    let live = true;
    const q = new URLSearchParams({ placement, ...(categoryId ? { categoryId } : {}) });
    api.get(`${API_BASE}/my-promotions/availability?${q}`, { headers: authHeader })
      .then((res: any) => { if (live) setFullDates(res.days.filter((d: any) => d.left === 0).map((d: any) => d.date)); })
      .catch(() => {});
    return () => { live = false; };
  }, [placement, categoryId, promotions]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = () => ({
    placement, startsOn, endsOn, paymentProvider: provider,
    ...(needsProduct ? { productId } : {}), ...(placement === "category" ? { categoryId } : {}),
  });
  const complete = placement && startsOn && endsOn && (!needsProduct || productId) && (placement !== "category" || categoryId);

  // The price, from the API, priced as the booking will be. Nothing can be paid without it.
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (!complete) return;
    let live = true;
    api.post(`${API_BASE}/my-promotions/quote`, body(), { headers: authHeader })
      .then((q: Quote) => { if (live) setQuote(q); })
      .catch((err: any) => { if (live) setQuoteError(err.message || "We couldn't work out the price. Try again."); });
    return () => { live = false; };
  }, [placement, productId, categoryId, startsOn, endsOn, provider, promotions]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocked = !quote || quote.fullDays.length > 0 || quote.clash || paying;

  const finish = async (id: string) => {
    const res: any = await api.get(`${API_BASE}/my-promotions/${id}`, { headers: authHeader }).catch(() => null);
    await load().catch(() => {});
    const state = res?.promotion?.state;
    if (state === "running" || state === "scheduled") {
      toast.success(state === "running" ? "Your promotion is live" : "Your promotion is booked");
      setStartsOn("");
      setEndsOn("");
    } else if (state === "stopped") {
      toast.error("Those dates filled up before your payment arrived. Your payment is being refunded.");
    } else if (state === "failed") {
      toast.error("The payment didn't go through, so nothing was booked.");
    } else {
      toast("If you paid, your promotion will show here shortly.");
    }
    setPaying(false);
  };

  // Takes the payment the API started, by Naylet or Paystack.
  const collect = async ({ promotion, payment }: { promotion: Promotion; payment: any }) => {
    if (payment.provider === "naylet") {
      setApproving(payment.amountNgn);
      const until = Date.now() + NAYLET_WAIT_MS;
      while (Date.now() < until && !stopWaiting.current) {
        await new Promise((r) => setTimeout(r, 3000));
        const res: any = await api.get(`${API_BASE}/my-promotions/${promotion.id}`, { headers: authHeader }).catch(() => null);
        if (res && res.promotion.state !== "awaiting_payment") break;
      }
      setApproving(null);
      await finish(promotion.id);
      return;
    }
    paystack.resumeTransaction(payment.access_code, {
      onSuccess: () => void finish(promotion.id),
      onCancel: () => void finish(promotion.id),
      onError: () => void finish(promotion.id),
    });
  };

  const placeBid = async () => {
    setBidding(true);
    try {
      const res = await api.post(`${API_BASE}/my-promotions/bids`, {
        placement: bidPlacement, amount: bidAmount,
        ...(bidNeedsProduct ? { productId: bidProduct } : {}), ...(bidPlacement === "category" ? { categoryId: bidCategory } : {}),
      }, { headers: authHeader });
      applyBids(res);
      setBidAmount("");
      toast.success("Your bid is in");
    } catch (err: any) {
      toast.error(err.message || "Your bid didn't go through");
    } finally {
      setBidding(false);
    }
  };

  const payBid = async (bid: Bid, how: "paystack" | "naylet") => {
    setPaying(true);
    setError(null);
    try {
      await collect(await api.post(`${API_BASE}/my-promotions/pay-bid`, { bidId: bid.id, paymentProvider: how }, { headers: authHeader }));
    } catch (err: any) {
      setError({ text: err.message || "The payment could not be started", connect: err.message?.includes("Connect your Naylet") });
      setPaying(false);
      await load().catch(() => {});
    }
  };

  const pay = async () => {
    setPaying(true);
    setError(null);
    try {
      await collect(await api.post(`${API_BASE}/my-promotions`, body(), { headers: authHeader }));
    } catch (err: any) {
      setError({ text: err.message || "The payment could not be started", connect: err.message?.includes("Connect your Naylet") });
      setPaying(false);
      await load().catch(() => {});
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={ink.primary}>Promotions</h1>
        <p className="text-sm mt-1" style={ink.secondary}>
          Pay for a place on the store's home page. Your promotion starts by itself on the first day you choose and is labelled "Sponsored" for buyers.
        </p>
      </div>

      {freeDays && <FreeDaysBox free={freeDays} source="referral" today={limits.today} lastStart={lastStart} onBooked={() => load().catch(() => {})} />}
      {offerDays && <FreeDaysBox free={offerDays} source="offer" today={limits.today} lastStart={lastStart} onBooked={() => load().catch(() => {})} />}

      {bundles.filter((b) => Object.values(b.daysLeft).some((n) => n > 0)).map((b) => (
        <BundleDays key={b.id} bundle={b} products={sellable} allCategories={allCategories} today={limits.today} lastStart={lastStart}
          onBooked={() => load().catch(() => {})} />
      ))}

      {!loading && forSale.length === 0 && biddable.length === 0 ? (
        <div className="p-5 rounded-xl text-sm flex items-center gap-3" style={{ ...card, ...ink.secondary }}>
          <Megaphone className="h-5 w-5 shrink-0" aria-hidden /> Promotions aren't on sale right now. Please check back soon.
        </div>
      ) : forSale.length > 0 && (
        <form className="p-5 rounded-xl grid gap-4" style={card} onSubmit={(e) => { e.preventDefault(); if (!blocked) void pay(); }}>
          <fieldset className="grid gap-2 sm:grid-cols-3">
            <legend className="text-sm mb-2" style={ink.secondary}>Where do you want to appear?</legend>
            {forSale.map((p) => (
              <label key={p.id} className="p-3 rounded-lg border text-sm cursor-pointer grid gap-1"
                style={{ borderColor: placement === p.id ? "var(--color-primary)" : "var(--color-border)", ...ink.primary }}>
                <span className="flex items-center gap-2 font-semibold">
                  <input type="radio" name="placement" checked={placement === p.id} onChange={() => { setPlacement(p.id); setCategoryId(""); }} /> {p.label}
                </span>
                <span className="text-xs" style={ink.secondary}>{WHAT_YOU_GET[p.id]}</span>
                <span className="text-xs font-semibold">{naira(p.dayPrice)} a day</span>
              </label>
            ))}
          </fieldset>

          {needsProduct && (
            <label className="text-sm space-y-1 block">
              <span style={ink.secondary}>Which product?</span>
              <select value={productId} onChange={(e) => { setProductId(e.target.value); setCategoryId(""); }} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
                <option value="">Choose a product</option>
                {sellable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          {placement === "category" && productId && (
            <label className="text-sm space-y-1 block">
              <span style={ink.secondary}>Which category?</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categories.length === 0 && <span className="block text-xs" style={{ color: "var(--color-error)" }}>This product isn't in a category yet. Add one under Products first.</span>}
            </label>
          )}

          {chosen && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm space-y-1 block">
                <span style={ink.secondary}>First day</span>
                <input type="date" value={startsOn} min={limits.today} max={lastStart} onChange={(e) => { setStartsOn(e.target.value); if (!endsOn || endsOn < e.target.value) setEndsOn(e.target.value); }}
                  className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input} />
              </label>
              <label className="text-sm space-y-1 block">
                <span style={ink.secondary}>Last day (up to {limits.maxDays} days)</span>
                <input type="date" value={endsOn} min={startsOn || limits.today} onChange={(e) => setEndsOn(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input} />
              </label>
            </div>
          )}

          {chosen && fullDates.length > 0 && (
            <div className="text-sm grid gap-1.5">
              <p style={ink.secondary}>Already full:</p>
              <div className="flex flex-wrap gap-1.5">
                {fullDates.slice(0, 30).map((d) => <span key={d} className="px-2 py-0.5 rounded text-xs" style={{ border: "1px solid var(--color-border)", ...ink.secondary }}>{longDate(d)}</span>)}
                {fullDates.length > 30 && <span className="text-xs" style={ink.muted}>and {fullDates.length - 30} more</span>}
              </div>
            </div>
          )}

          {chosen && (
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="text-sm mb-2" style={ink.secondary}>How do you want to pay?</legend>
              {([["paystack", "Paystack", "Card, bank transfer or USSD"], ["naylet", "Naylet wallet", "Approve in the Naylet app"]] as const).map(([value, label, note]) => (
                <label key={value} className="p-3 rounded-lg border text-sm cursor-pointer" style={{ borderColor: provider === value ? "var(--color-primary)" : "var(--color-border)", ...ink.primary }}>
                  <span className="flex items-center gap-2 font-semibold"><input type="radio" name="provider" checked={provider === value} onChange={() => setProvider(value)} /> {label}</span>
                  <span className="block text-xs mt-1" style={ink.secondary}>{note}</span>
                </label>
              ))}
            </fieldset>
          )}

          {complete && (
            <dl className="grid gap-1.5 text-sm pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <div className="flex justify-between gap-3"><dt style={ink.secondary}>{quote ? `${quote.days} day${quote.days === 1 ? "" : "s"} × ${naira(chosen?.dayPrice ?? 0)}` : "Promotion"}</dt><dd style={ink.primary}>{quote ? naira(quote.amount) : quoteError ? "—" : "…"}</dd></div>
              <div className="flex justify-between gap-3"><dt style={ink.secondary}>Payment fee</dt><dd style={ink.primary}>{quote ? naira(quote.fee) : quoteError ? "—" : "…"}</dd></div>
              <div className="flex justify-between gap-3 font-bold" style={ink.primary}><dt>Total</dt><dd>{quote ? naira(quote.total) : quoteError ? "—" : "…"}</dd></div>
            </dl>
          )}

          {quoteError && <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>{quoteError}</p>}
          {quote && quote.fullDays.length > 0 && (
            <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>
              {quote.fullDays.length === 1 ? `${longDate(quote.fullDays[0])} is full.` : `${quote.fullDays.length} of those days are full.`} Choose other dates.
            </p>
          )}
          {quote?.clash && <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>You already have this promotion on some of those dates.</p>}
          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>
              {error.text}{error.connect && <> <Link to="/merchant/payouts" className="underline">Connect it under Payouts</Link>.</>}
            </p>
          )}
          {approving !== null && <p className="text-sm font-semibold" style={ink.primary}>Open Naylet on your phone and approve {naira(approving)}. This page will update by itself.</p>}

          {chosen && (
            <>
              <button type="submit" disabled={blocked} className="h-11 px-5 rounded-lg font-medium disabled:opacity-50 justify-self-start"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, var(--color-primary-ink, #fff))" }}>
                {paying ? "Processing…" : quote ? `Pay ${naira(quote.total)}` : "Pay"}
              </button>
              <p className="text-xs" style={ink.muted}>
                Your dates are held for 30 minutes while you pay. If your product goes out of stock or is hidden, it leaves the home page until it's back, with no refund or extra days. Paid promotions can't be cancelled by you.
              </p>
            </>
          )}
        </form>
      )}

      {(biddable.length > 0 || bids.length > 0) && round && (
        <section className="p-5 rounded-xl grid gap-4" style={card}>
          <div>
            <h2 className="font-semibold" style={ink.primary}>Bid for next week</h2>
            <p className="text-sm mt-1" style={ink.secondary}>
              For {longDate(round.weekStart)} to {longDate(round.weekEnd)}. Bids are private and free to place, and you can raise yours until {longDate(round.closesAt.slice(0, 10))} at {clockHour(round.closesAt)}.
              The highest bids win and pay what they bid within 24 hours, or the slot goes to the next bidder. Winning twice without paying stops you bidding for 30 days.
            </p>
          </div>
          {bidBlocked ? (
            <p role="alert" className="text-sm" style={{ color: "var(--color-error)" }}>You can't bid for now: you recently won twice without paying.</p>
          ) : biddable.length > 0 && (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void placeBid(); }}>
              <label className="text-sm space-y-1 block">
                <span style={ink.secondary}>Where?</span>
                <select value={bidPlacement} onChange={(e) => { setBidPlacement(e.target.value); setBidCategory(""); }} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
                  <option value="">Choose a place</option>
                  {biddable.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              {bidNeedsProduct && (
                <label className="text-sm space-y-1 block">
                  <span style={ink.secondary}>Which product?</span>
                  <select value={bidProduct} onChange={(e) => { setBidProduct(e.target.value); setBidCategory(""); }} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
                    <option value="">Choose a product</option>
                    {sellable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              )}
              {bidPlacement === "category" && bidProduct && (
                <label className="text-sm space-y-1 block">
                  <span style={ink.secondary}>Which category?</span>
                  <select value={bidCategory} onChange={(e) => setBidCategory(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input}>
                    <option value="">Choose a category</option>
                    {bidCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              )}
              {bidPlace && (
                <label className="text-sm space-y-1 block">
                  <span style={ink.secondary}>Your bid (₦){bidPlace.minBid > 0 ? `, at least ${naira(bidPlace.minBid)}` : ""}, for the whole week</span>
                  <input inputMode="numeric" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-transparent" style={input} />
                </label>
              )}
              {bidPlace && (
                <button type="submit" disabled={bidding || !bidAmount.trim()} className="h-10 px-5 rounded-lg font-medium disabled:opacity-50 self-end justify-self-start"
                  style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary, var(--color-primary-ink, #fff))" }}>
                  {bidding ? "Sending…" : "Place bid"}
                </button>
              )}
            </form>
          )}
          {bids.length > 0 && (
            <ul className="grid gap-2">
              {bids.map((b) => {
                const [label, color] = BID_LABEL[b.state] ?? [b.state, "var(--color-text-secondary)"];
                return (
                  <li key={b.id} className="p-3 rounded-lg grid gap-2" style={{ border: "1px solid var(--color-border)" }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={ink.primary}>{b.title}</p>
                        <p className="text-xs" style={ink.secondary}>Week of {longDate(b.weekStart)} · your bid {naira(b.amount)}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color }}>{label}</p>
                    </div>
                    {b.state === "won" && (
                      <div className="flex flex-wrap items-center gap-2">
                        {(["paystack", "naylet"] as const).map((how) => (
                          <button key={how} type="button" disabled={paying} onClick={() => void payBid(b, how)} className="h-9 px-3 rounded-lg text-sm font-medium border disabled:opacity-50" style={input}>
                            Pay {naira(b.amount + b.fees[how])} with {how === "paystack" ? "Paystack" : "Naylet"}
                          </button>
                        ))}
                        {b.payBy && <span className="text-xs" style={ink.muted}>by {new Date(b.payBy.replace(" ", "T")).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold" style={ink.primary}>Your promotions</h2>
        {!loading && promotions.length === 0 && <div className="p-5 rounded-xl text-sm" style={{ ...card, ...ink.secondary }}>You haven't bought a promotion yet.</div>}
        {promotions.map((p) => {
          const [label, color] = STATE_LABEL[p.state] ?? [p.state, "var(--color-text-secondary)"];
          return (
            <div key={p.id} className="p-4 rounded-xl flex flex-wrap items-start justify-between gap-3" style={card}>
              <div className="min-w-0">
                <p className="font-semibold" style={ink.primary}>{p.title}</p>
                <p className="text-sm" style={ink.secondary}>{longDate(p.startsOn)} to {longDate(p.endsOn)} · {p.days} day{p.days === 1 ? "" : "s"}</p>
                {p.refunded !== null && (
                  <p className="text-sm mt-1" style={ink.secondary}>
                    {p.refundStatus === "refunded" ? `${naira(p.refunded)} refunded` : `${naira(p.refunded)} refund in progress`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color }}>{label}</p>
                <p className="text-sm" style={ink.secondary}>{p.source === "referral" || p.source === "offer" ? "Free" : p.source === "package" ? "From your bundle" : naira(p.amount + p.fee)}</p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
