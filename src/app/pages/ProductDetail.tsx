import { useState, type FormEvent } from "react";
import { useParams, Link } from "react-router";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowLeft, Minus, Plus, ShoppingCart, Star, MessageCircle, Store } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

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

export function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { user, authHeader } = useAuth();
  const { openMerchantChat } = useChat();
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { data, loading, error } = useAPI(`${API_BASE}/products/${id}`);
  const product = data as any;

  const { data: reviewsData, refetch: refetchReviews } = useAPI(`${API_BASE}/reviews?productId=${id}`);
  const reviews = (reviewsData ?? []) as any[];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Product Not Found
          </h1>
          <Link
            to="/#shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        codEligible: product.codEligible,
      },
      quantity
    );
    toast.success(`Added ${quantity} × ${product.name} to cart`);
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewError(null);

    try {
      await api.post(`${API_BASE}/reviews`, { productId: id, ...reviewForm }, { headers: authHeader });
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="relative aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <ImageWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
            {product.badge && (
              <div
                className="absolute top-3 right-3 px-3 py-1 rounded text-white text-sm font-medium"
                style={{ backgroundColor: product.inStock ? 'var(--color-product-badge)' : 'var(--color-text-secondary)' }}
              >
                {product.badge}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>{product.categories?.join(", ")}</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {product.name}
            </h1>

            {product.reviewCount > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarRating rating={product.avgRating} />
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {product.avgRating} ({product.reviewCount} review{product.reviewCount === 1 ? '' : 's'})
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                ${product.price}
              </span>
              {product.originalPrice && (
                <span className="text-lg line-through" style={{ color: 'var(--color-text-muted)' }}>
                  ${product.originalPrice}
                </span>
              )}
            </div>

            <p className="mb-6 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              {product.description}
            </p>

            {!product.inStock && (
              <p className="mb-4 font-medium" style={{ color: 'var(--color-error)' }}>
                Currently out of stock.
              </p>
            )}
            {product.inStock && !product.codEligible && (
              <p className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Not available for Cash on Delivery.
              </p>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-3 transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-cart-button)', color: 'white' }}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </button>
            </div>

            {product.merchantSlug && (
              <Link
                to={`/sellers/${product.merchantSlug}`}
                className="inline-flex items-center gap-2 mb-3 transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                <Store className="h-4 w-4" />
                Sold by {product.merchantName}
              </Link>
            )}

            {product.merchantId && (
              <button
                onClick={() => openMerchantChat(product.merchantId, product.merchantName)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <MessageCircle className="h-5 w-5" />
                Chat with {product.merchantName}
              </button>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h2>

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
                placeholder="Share your thoughts on this product..."
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
              <Link to="/login" style={{ color: 'var(--color-primary)' }}>Log in</Link> to leave a review.
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
              <p style={{ color: 'var(--color-text-muted)' }}>No reviews yet. Be the first to review this product.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
