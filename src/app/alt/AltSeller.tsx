import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router";
import { toast } from "sonner";
import { MapPin, MessageCircle, Store } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useChat } from "../context/ChatContext";
import { trackInsight } from "../utils/insights";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Listing } from "./AltSearch";
import { altPath, Stars, type AltProduct } from "./shared";

function SellerReviews({ merchantId }: { merchantId: string }) {
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
      toast.success("Review submitted");
    } catch (error: any) {
      setErr(error.message || "Could not submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid gap-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-extrabold">Seller reviews{reviews.length > 0 && ` (${reviews.length})`}</h2>
        <p className="text-sm alt-muted">Delivery, communication and service. Product reviews are on each product's page.</p>
      </div>
      {reviews.length === 0 && <p className="text-sm alt-soft">No seller reviews yet.</p>}
      <div className="grid gap-3">
        {reviews.map((r) => (
          <div key={r.id} className="alt-card p-4 grid gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-sm">{r.customerName}</span>
              <span className="text-xs alt-muted">{new Date(r.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <Stars rating={r.rating} size={13} />
            <p className="text-sm alt-soft whitespace-pre-line">{r.comment}</p>
          </div>
        ))}
      </div>
      {user ? (
        <form onSubmit={submit} className="alt-card p-4 grid gap-3">
          <p className="font-bold text-sm">Rate this seller</p>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setForm({ ...form, rating: n })} className="p-0.5">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={n <= form.rating ? "var(--a-star)" : "none"} stroke="var(--a-star)" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
          <textarea required rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="How was your experience with this seller?" className="alt-input py-3" aria-label="Your review" />
          {err && <p className="text-sm" style={{ color: "var(--a-bad)" }}>{err}</p>}
          <button type="submit" disabled={busy} className="alt-btn justify-self-start">{busy ? "Submitting…" : "Submit review"}</button>
        </form>
      ) : (
        <p className="text-sm alt-soft">
          <button type="button" className="alt-link font-semibold text-sm" onClick={() => openLogin(location.pathname)}>Log in</button> to rate this seller.
        </p>
      )}
    </section>
  );
}

export function AltSeller() {
  const { slug = "" } = useParams();
  const { openMerchantChat } = useChat();
  const { data: profileData, loading, error } = useAPI(`${API_BASE}/sellers/${slug}`);
  const profile = profileData as any;
  const { data: productsData, loading: productsLoading } = useAPI(
    profile ? `${API_BASE}/products?merchantId=${profile.merchantId}` : null
  );
  const products = (productsData ?? []) as AltProduct[];

  useEffect(() => trackInsight("visit", profile?.merchantId), [profile?.merchantId]);

  if (loading) {
    return (
      <div className="alt-wrap py-6 grid gap-3" aria-busy="true">
        <div className="alt-skel aspect-[4/1] w-full rounded-2xl" /><div className="alt-skel h-8 w-1/3" /><div className="alt-skel h-4 w-1/2" />
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="alt-wrap py-16 grid justify-items-center gap-3 text-center">
        <Store className="h-12 w-12 alt-muted" aria-hidden />
        <h1 className="text-2xl font-extrabold">We can't find that shop</h1>
        <Link to={altPath("/search")} className="alt-btn">Browse all products</Link>
      </div>
    );
  }

  const where = [profile.area, profile.state].filter(Boolean).join(", ");

  return (
    <div className="pb-10">
      <div className="alt-wrap pt-4 grid gap-4">
        {profile.bannerImage && (
          <div className="w-full aspect-[3/1] sm:aspect-[5/1] rounded-2xl overflow-hidden" style={{ background: "var(--a-sunk)" }}>
            <ImageWithFallback src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold">{profile.merchantName}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm alt-soft">
              {where && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden /> {where}</span>}
              {profile.sellerReviewCount > 0 && (
                <span className="flex items-center gap-1.5"><Stars rating={profile.sellerAvgRating} size={13} /> {profile.sellerAvgRating} seller rating ({profile.sellerReviewCount})</span>
              )}
              {profile.productReviewCount > 0 && (
                <span className="flex items-center gap-1.5"><Stars rating={profile.productAvgRating} size={13} /> {profile.productAvgRating} across products ({profile.productReviewCount})</span>
              )}
            </div>
            {profile.bio && <p className="alt-soft max-w-2xl whitespace-pre-line">{profile.bio}</p>}
          </div>
          <button type="button" className="alt-btn-ghost" onClick={() => openMerchantChat(profile.merchantId, profile.merchantName)}>
            <MessageCircle className="h-4 w-4" aria-hidden /> Chat with seller
          </button>
        </div>
      </div>

      <div className="alt-wrap pt-6">
        <Listing products={products} loading={productsLoading || !productsData} title="Products" showSeller={false} />
      </div>

      <div className="alt-wrap pt-10">
        <SellerReviews merchantId={profile.merchantId} />
      </div>
    </div>
  );
}
