import { useState, type FormEvent } from "react";
import { useParams, useLocation, Link } from "react-router";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ProductCard } from "../components/ProductCard";
import { ArrowLeft, Star, Package, MapPin } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { NotFound } from "./NotFound";

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          fill={n <= Math.round(rating) ? "var(--color-accent)" : "none"}
          style={{ color: 'var(--color-accent)' }}
        />
      ))}
    </div>
  );
}

export function SellerPage() {
  const { slug } = useParams();
  const { user, authHeader } = useAuth();
  const { openLogin } = useAuthModal();
  const location = useLocation();
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { data: profileData, loading: profileLoading, error: profileError } = useAPI(`${API_BASE}/sellers/${slug}`);
  const profile = profileData as any;

  const { data: productsData, loading: productsLoading } = useAPI(
    profile ? `${API_BASE}/products?merchantId=${profile.merchantId}` : ""
  );
  const products = (productsData ?? []) as any[];

  const { data: reviewsData, refetch: refetchReviews } = useAPI(
    profile ? `${API_BASE}/seller-reviews?merchantId=${profile.merchantId}` : ""
  );
  const reviews = (reviewsData ?? []) as any[];

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading shop...</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return <NotFound />;
  }

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewError(null);

    try {
      await api.post(`${API_BASE}/seller-reviews`, { merchantId: profile.merchantId, ...reviewForm }, { headers: authHeader });
      setReviewForm({ rating: 5, comment: "" });
      refetchReviews();
      toast.success("Review submitted");
    } catch (err: any) {
      setReviewError(err.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/#shop"
          className="inline-flex items-center gap-2 mb-6 transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Shop
        </Link>

        {profile.bannerImage && (
          <div className="w-full aspect-[3/1] rounded-xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-product-card)' }}>
            <ImageWithFallback src={profile.bannerImage} alt={profile.merchantName} className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {profile.merchantName}
        </h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
          {(profile.area || profile.state) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {[profile.area, profile.state].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
          {profile.productReviewCount > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={profile.productAvgRating} />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {profile.productAvgRating} product rating ({profile.productReviewCount})
              </span>
            </div>
          )}
          {profile.sellerReviewCount > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={profile.sellerAvgRating} />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {profile.sellerAvgRating} seller rating ({profile.sellerReviewCount})
              </span>
            </div>
          )}
        </div>

        {profile.bio && (
          <p className="mb-8 max-w-3xl text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            {profile.bio}
          </p>
        )}

        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Products</h2>

        {!productsLoading && products.length === 0 && (
          <div className="text-center py-12 mb-12" style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem' }}>
            <Package className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>This shop doesn't have any products yet.</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} showMerchant={false} />
            ))}
          </div>
        )}

        {/* Seller reviews */}
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
            Seller Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h2>
          <p className="text-sm mb-4 -mt-4" style={{ color: 'var(--color-text-muted)' }}>
            Rate your experience with this seller - shipping, communication, service. Product quality reviews
            belong on the product page.
          </p>

          {user ? (
            <form onSubmit={handleReviewSubmit} className="p-4 rounded-lg mb-6" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Your Rating</label>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                    aria-label={`${n} star`}
                  >
                    <Star
                      className="h-6 w-6"
                      fill={n <= reviewForm.rating ? "var(--color-accent)" : "none"}
                      style={{ color: 'var(--color-accent)' }}
                    />
                  </button>
                ))}
              </div>
              <textarea
                required
                placeholder="Share how your experience with this seller was..."
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border mb-3"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                rows={3}
              />
              {reviewError && <p className="text-sm mb-3" style={{ color: 'var(--color-error)' }}>{reviewError}</p>}
              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          ) : (
            <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              <button onClick={() => openLogin(location.pathname)} style={{ color: 'var(--color-primary)' }}>Log in</button> to leave a review.
            </p>
          )}

          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{review.customerName}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <StarRating rating={review.rating} size={14} />
                <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>{review.comment}</p>
              </div>
            ))}
            {reviews.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)' }}>No seller reviews yet. Be the first to leave one.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
