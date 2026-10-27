import { useState, type FormEvent } from "react";
import { useParams, useLocation, Link } from "react-router";
import { toast } from "sonner";
import { ProductGallery } from "../components/ProductGallery";
import { ArrowLeft, Minus, Plus, ShoppingCart, Star, MessageCircle, Store, GraduationCap, Lock, PlayCircle, FileText, ClipboardCheck, Award } from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useChat } from "../context/ChatContext";
import { isPhysical, productTypeLabel, requiresAccount } from "../utils/productTypes";
import { getGuestId } from "../utils/guestId.js";
import { formatDuration } from "../utils/formatDuration";
import { TicketPicker } from "../components/TicketPicker";

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
  const { openLogin } = useAuthModal();
  const location = useLocation();
  const { openMerchantChat } = useChat();
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { data, loading, error } = useAPI(`${API_BASE}/products/${id}`);
  const product = data as any;

  const { data: reviewsData, refetch: refetchReviews } = useAPI(`${API_BASE}/reviews?productId=${id}`);
  const reviews = (reviewsData ?? []) as any[];

  // Courses: the curriculum, and whether this visitor is already enrolled.
  const { data: courseData } = useAPI(
    product?.productType === "course" ? `${API_BASE}/learn/${id}?guestId=${encodeURIComponent(getGuestId())}` : null,
    user ? { headers: authHeader } : {}
  );
  const course = courseData as any;

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

  const physical = isPhysical(product.productType);
  const emptyCourse = product.productType === "course" && !product.lessonCount;

  const handleAddToCart = () => {
    if (!user && requiresAccount(product.productType)) {
      toast.info(`Log in to buy ${productTypeLabel(product.productType).toLowerCase()}s`);
      openLogin(location.pathname);
      return;
    }
    addItem(
      {
        id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        codEligible: product.codEligible,
        productType: product.productType,
      },
      physical ? quantity : 1
    );
    toast.success(physical ? `Added ${quantity} × ${product.name} to cart` : `Added ${product.name} to cart`);
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
          <ProductGallery
            media={product.media}
            fallbackImage={product.image}
            alt={product.name}
            overlay={product.badge && (
              <div
                className="absolute top-3 right-3 px-3 py-1 rounded text-white text-sm font-medium"
                style={{ backgroundColor: product.inStock ? 'var(--color-product-badge)' : 'var(--color-text-secondary)' }}
              >
                {product.badge}
              </div>
            )}
          />

          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {!physical && (
                <span className="inline-block mr-2 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                  {productTypeLabel(product.productType)}
                </span>
              )}
              {product.categories?.join(", ")}
            </p>
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
                ₦{product.price}
              </span>
              {product.originalPrice && (
                <span className="text-lg line-through" style={{ color: 'var(--color-text-muted)' }}>
                  ₦{product.originalPrice}
                </span>
              )}
            </div>

            <p className="mb-6 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              {product.description}
            </p>

            {!physical && product.productType !== "ticket" && (
              <p className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Instant access after payment &mdash; it appears in your Library and we email you a link.
              </p>
            )}
            {physical && !product.inStock && (
              <p className="mb-4 font-medium" style={{ color: 'var(--color-error)' }}>
                Currently out of stock.
              </p>
            )}
            {physical && product.inStock && !product.codEligible && (
              <p className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Not available for Cash on Delivery.
              </p>
            )}

            {product.productType === "ticket" ? (
              <TicketPicker product={product} />
            ) : (
            <div className="flex items-center gap-4 mb-6">
              {physical && (
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
              )}

              {course?.enrolled ? (
                <Link
                  to={`/learn/${id}?token=${encodeURIComponent(course.token)}`}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                >
                  <GraduationCap className="h-5 w-5" />
                  Go to course
                </Link>
              ) : (
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || emptyCourse}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-cart-button)', color: 'white' }}
              >
                <ShoppingCart className="h-5 w-5" />
                {emptyCourse ? "Enrolment opens soon" : "Add to Cart"}
              </button>
              )}
            </div>
            )}

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

        {course && course.lessonCount > 0 && (
          <div className="mt-12 max-w-3xl">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Course content</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {course.modules.length} module{course.modules.length === 1 ? "" : "s"} · {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
              {course.durationSeconds ? ` · ${formatDuration(course.durationSeconds)} of video` : ""}
            </p>
            {course.certificateEnabled && (
              <p className="text-sm mb-4 -mt-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                <Award className="h-4 w-4" /> Certificate of completion included
              </p>
            )}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {course.modules.map((module: any, mi: number) => (
                <div key={module.id} style={{ borderTop: mi ? '1px solid var(--color-border)' : undefined }}>
                  <p className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-product-card)' }}>
                    {mi + 1}. {module.title}
                  </p>
                  <ul>
                    {module.lessons.map((lesson: any) => {
                      const open = !lesson.locked;
                      const Icon = !open ? Lock : lesson.hasVideo ? PlayCircle : lesson.hasQuiz ? ClipboardCheck : FileText;
                      return (
                        <li key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 text-sm" style={{ borderTop: '1px solid var(--color-border)' }}>
                          <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                          <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>{lesson.title}</span>
                          {lesson.isPreview && !course.enrolled && (
                            <Link to={`/learn/${id}?lesson=${encodeURIComponent(lesson.id)}`} className="font-medium hover:underline flex-shrink-0" style={{ color: 'var(--color-primary)' }}>
                              Preview
                            </Link>
                          )}
                          {lesson.durationSeconds ? (
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{formatDuration(lesson.durationSeconds)}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

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
              <p style={{ color: 'var(--color-text-muted)' }}>No reviews yet. Be the first to review this product.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
