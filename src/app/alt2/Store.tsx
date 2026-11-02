import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { MapPin, MessageCircle, Store as StoreIcon } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useChat } from "../context/ChatContext";
import { trackInsight } from "../utils/insights";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Listing } from "./Browse";
import { EmptyState, m2, Monogram, Stars, type AltProduct } from "./ui";

function StoreReviews({ merchantId }: { merchantId: string }) {
  const { user, authHeader } = useAuth();
  const { openLogin } = useAuthModal();
  const location = useLocation();
  const { data, refetch } = useAPI(`${API_BASE}/seller-reviews?merchantId=${merchantId}`);
  const reviews = (data ?? []) as any[];
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post(`${API_BASE}/seller-reviews`, { merchantId, ...form }, { headers: authHeader });
      setForm({ rating: 5, comment: "" });
      refetch();
      toast.success("Thanks - your review is up");
    } catch (error: any) {
      setErr(error.message || "Could not submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 items-start">
      <div className="grid gap-3">
        <p className="text-sm m2-ink3">About the seller: delivery, communication and service. Product reviews are on each product's page.</p>
        {reviews.length === 0 && <p className="m2-ink2">No seller reviews yet.</p>}
        {reviews.map((r) => (
          <article key={r.id} className="pb-3 grid gap-1" style={{ borderBottom: "1px solid var(--m-line)" }}>
            <div className="flex items-center gap-2"><Stars rating={r.rating} size={13} /><span className="font-semibold text-sm">{r.customerName}</span></div>
            <p className="text-xs m2-ink3">{new Date(r.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
            <p className="text-[15px] m2-ink2 whitespace-pre-line">{r.comment}</p>
          </article>
        ))}
      </div>
      {user ? (
        <form onSubmit={submit} className="m2-panel p-4 grid gap-2">
          <p className="font-bold text-sm">Rate this seller</p>
          <div className="flex gap-0.5" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setForm({ ...form, rating: n })} className="p-0.5">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={n <= form.rating ? "var(--m-star)" : "none"} stroke="var(--m-star)" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
          <textarea required rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="How was buying from them?" aria-label="Your review" className="m2-input" />
          {err && <p className="text-sm" style={{ color: "var(--m-bad)" }}>{err}</p>}
          <button type="submit" disabled={busy} className="m2-btn m2-btn-sm justify-self-start">{busy ? "Posting…" : "Post review"}</button>
        </form>
      ) : (
        <button type="button" className="m2-btn-line" onClick={() => openLogin(location.pathname)}>Log in to rate this seller</button>
      )}
    </div>
  );
}

export function StorePage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { openMerchantChat } = useChat();
  const { data: pData, loading, error } = useAPI(`${API_BASE}/sellers/${slug}`);
  const profile = pData as any;
  const { data: prodData, loading: prodLoading } = useAPI(profile ? `${API_BASE}/products?merchantId=${profile.merchantId}` : null);
  const products = (prodData ?? []) as AltProduct[];
  const tab = params.get("tab") === "reviews" ? "reviews" : "products";
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => p.categories?.forEach((c) => m.set(c, (m.get(c) ?? 0) + 1)));
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [products]);

  useEffect(() => trackInsight("visit", profile?.merchantId), [profile?.merchantId]);

  if (loading) return <div className="m2-wrap py-5 grid gap-3" aria-busy="true"><div className="m2-skel h-40" /><div className="m2-skel h-8 w-1/3" /></div>;
  if (error || !profile) {
    return (
      <div className="m2-wrap py-10">
        <EmptyState icon={<StoreIcon className="h-10 w-10" />} title="We can't find that shop" action={<Link to={m2()} className="m2-btn">Back to the marketplace</Link>} />
      </div>
    );
  }

  const where = [profile.area, profile.state].filter(Boolean).join(", ");
  const setTab = (t: string) => {
    const next = new URLSearchParams();
    if (t === "reviews") next.set("tab", "reviews");
    setParams(next, { replace: true });
  };

  return (
    <div className="pb-10">
      <div className="relative h-32 sm:h-48" style={{ background: "var(--m-band)" }}>
        {profile.bannerImage
          ? <ImageWithFallback src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
          : <div className="grid grid-cols-4 sm:grid-cols-6 h-full opacity-60">{products.slice(0, 6).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" className="w-full h-full object-cover" />)}</div>}
      </div>
      <div className="m2-wrap">
        <div className="flex flex-wrap items-end gap-4 -mt-8 sm:-mt-10 relative">
          <span className="rounded-lg" style={{ border: "3px solid var(--m-surface)", background: "var(--m-surface)" }}><Monogram name={profile.merchantName} size={76} /></span>
          <div className="flex-1 min-w-[200px] pt-10 sm:pt-12 grid gap-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{profile.merchantName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm m2-ink2">
              {profile.sellerReviewCount > 0 && <span className="flex items-center gap-1.5"><Stars rating={profile.sellerAvgRating} size={13} /> <b className="m2-num">{profile.sellerAvgRating}</b> seller rating ({profile.sellerReviewCount})</span>}
              {profile.productReviewCount > 0 && <span className="flex items-center gap-1.5"><Stars rating={profile.productAvgRating} size={13} /> <b className="m2-num">{profile.productAvgRating}</b> on products ({profile.productReviewCount})</span>}
              {where && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {where}</span>}
              {!prodLoading && <span>{products.length} product{products.length === 1 ? "" : "s"}</span>}
            </div>
          </div>
          <button type="button" className="m2-btn-line" onClick={() => openMerchantChat(profile.merchantId, profile.merchantName)}><MessageCircle className="h-4 w-4" /> Ask the seller</button>
        </div>
        {profile.bio && <p className="mt-4 max-w-3xl m2-ink2 whitespace-pre-line">{profile.bio}</p>}

        <div role="tablist" aria-label="Shop" className="mt-6 mb-5 flex gap-6" style={{ borderBottom: "1px solid var(--m-line)" }}>
          {([["products", "Products"], ["reviews", `Reviews${profile.sellerReviewCount ? ` (${profile.sellerReviewCount})` : ""}`]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="pb-3 -mb-px font-bold"
              style={{ borderBottom: tab === k ? "2px solid var(--m-accent)" : "2px solid transparent", color: tab === k ? "var(--m-ink)" : "var(--m-ink-3)" }}>{label}</button>
          ))}
        </div>

        {tab === "products" ? (
          <Listing products={products} loading={prodLoading || !prodData} showStore={false} searchLabel={`Search ${profile.merchantName}`}
            heading={categories.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto m2-scroll -mx-1 px-1" aria-label="Shop categories">
                <button type="button" className="m2-chip" aria-pressed={!params.get("category")} onClick={() => { const n = new URLSearchParams(params); n.delete("category"); setParams(n, { replace: true }); }}>All</button>
                {categories.map(([c, n]) => (
                  <button key={c} type="button" className="m2-chip" aria-pressed={params.get("category") === c}
                    onClick={() => { const next = new URLSearchParams(params); next.set("category", c); setParams(next, { replace: true }); }}>
                    {c} <span className="m2-num opacity-60">{n}</span>
                  </button>
                ))}
              </div>
            ) : undefined} />
        ) : <StoreReviews merchantId={profile.merchantId} />}
      </div>
    </div>
  );
}
