import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  Award, BadgeCheck, ChevronRight, ClipboardCheck, Copy, CreditCard, FileText, GraduationCap, Lock, MapPin,
  MessageCircle, Minus, Package, PlayCircle, Plus, Share2, Store, Truck, Zap,
} from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useChat } from "../context/ChatContext";
import { isPhysical, productTypeLabel } from "../utils/productTypes";
import { getGuestId } from "../utils/guestId.js";
import { formatDuration } from "../utils/formatDuration";
import { formatEventTime } from "../utils/eventTime";
import { trackInsight } from "../utils/insights";
import { TicketPicker } from "../components/TicketPicker";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AltProductCard } from "./AltProductCard";
import { Rail } from "./AltHome";
import { rememberViewed, recentlyViewed } from "./recent";
import { altPath, naira, saving, sellerPath, Stars, useCatalog, type AltProduct } from "./shared";

type Media = { type: "image" | "video"; url: string };

// Swipeable on phones (native scroll-snap), thumbnails and arrows-free on desktop.
function Gallery({ media, fallback, alt }: { media?: Media[]; fallback: string; alt: string }) {
  const items: Media[] = media?.length ? media : [{ type: "image", url: fallback }];
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="grid gap-2 min-w-0">
      <div className="relative">
        <div ref={track} className="flex overflow-x-auto snap-x snap-mandatory alt-scroll rounded-2xl aspect-square"
          style={{ background: "var(--a-sunk)" }}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}>
          {items.map((m, i) => (
            <div key={`${m.url}-${i}`} className="snap-start shrink-0 w-full h-full">
              {m.type === "video"
                ? <video src={m.url} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
                : <ImageWithFallback src={m.url} alt={i === 0 ? alt : `${alt}, photo ${i + 1}`} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <span className="absolute bottom-3 right-3 alt-tag tabular-nums" style={{ background: "var(--a-scrim)", color: "#fff" }}>
            {index + 1}/{items.length}
          </span>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto alt-scroll">
          {items.map((m, i) => (
            <button key={`${m.url}-${i}`} type="button" onClick={() => go(i)} aria-label={`Show ${m.type} ${i + 1}`}
              className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden"
              style={{ outline: i === index ? "2px solid var(--a-accent)" : "1px solid var(--a-line)", outlineOffset: i === index ? 1 : -1 }}>
              {m.type === "video"
                ? <><video src={m.url} muted playsInline preload="metadata" className="w-full h-full object-cover" /><PlayCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" /></>
                : <ImageWithFallback src={m.url} alt="" className="w-full h-full object-cover" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Share({ name }: { name: string }) {
  const url = window.location.href;
  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => toast.success("Link copied"), () => toast.error("Couldn't copy - copy it from the address bar"));
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="alt-muted inline-flex items-center gap-1.5"><Share2 className="h-4 w-4" aria-hidden /> Share</span>
      <a className="alt-chip" style={{ height: 32 }} target="_blank" rel="noopener noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(`${name} ${url}`)}`}>WhatsApp</a>
      <button type="button" className="alt-chip" style={{ height: 32 }} onClick={copy}><Copy className="h-3.5 w-3.5" aria-hidden /> Copy link</button>
    </div>
  );
}

function Reviews({ productId }: { productId: string }) {
  const { user, authHeader } = useAuth();
  const { openLogin } = useAuthModal();
  const location = useLocation();
  const { data, refetch } = useAPI(`${API_BASE}/reviews?productId=${productId}`);
  const reviews = (data ?? []) as any[];
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post(`${API_BASE}/reviews`, { productId, ...form }, { headers: authHeader });
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
    <section id="reviews" className="grid gap-4 scroll-mt-28">
      <h2 className="text-xl font-extrabold">Reviews{reviews.length > 0 && ` (${reviews.length})`}</h2>
      {reviews.length === 0 && <p className="alt-soft text-sm">No reviews yet.</p>}
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
          <p className="font-bold text-sm">Write a review</p>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setForm({ ...form, rating: n })} className="p-0.5">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={n <= form.rating ? "var(--a-star)" : "none"} stroke="var(--a-star)" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
          <textarea required rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="What did you think of it?" className="alt-input py-3" aria-label="Your review" />
          {err && <p className="text-sm" style={{ color: "var(--a-bad)" }}>{err}</p>}
          <button type="submit" disabled={busy} className="alt-btn justify-self-start">{busy ? "Submitting…" : "Submit review"}</button>
        </form>
      ) : (
        <p className="text-sm alt-soft">
          <button type="button" className="alt-link font-semibold text-sm" onClick={() => openLogin(location.pathname)}>Log in</button> to write a review.
        </p>
      )}
    </section>
  );
}

function CourseContents({ course, productId }: { course: any; productId: string }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-extrabold">Course content</h2>
      <p className="text-sm alt-muted">
        {course.modules.length} module{course.modules.length === 1 ? "" : "s"} · {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
        {course.durationSeconds ? ` · ${formatDuration(course.durationSeconds)} of video` : ""}
      </p>
      {course.certificateEnabled && (
        <p className="text-sm flex items-center gap-1.5 alt-soft"><Award className="h-4 w-4" aria-hidden /> Certificate of completion included</p>
      )}
      <div className="alt-card overflow-hidden">
        {course.modules.map((module: any, mi: number) => (
          <div key={module.id} style={{ borderTop: mi ? "1px solid var(--a-line)" : undefined }}>
            <p className="px-4 py-3 font-semibold text-sm" style={{ background: "var(--a-sunk)" }}>{mi + 1}. {module.title}</p>
            <ul>
              {module.lessons.map((lesson: any) => {
                const Icon = lesson.locked ? Lock : lesson.hasVideo ? PlayCircle : lesson.hasQuiz ? ClipboardCheck : FileText;
                return (
                  <li key={lesson.id} className="flex items-center gap-3 px-4 py-2.5 text-sm" style={{ borderTop: "1px solid var(--a-line)" }}>
                    <Icon className="h-4 w-4 shrink-0 alt-muted" aria-hidden />
                    <span className="flex-1 min-w-0 truncate alt-soft">{lesson.title}</span>
                    {lesson.isPreview && !course.enrolled && (
                      <Link to={`/learn/${productId}?lesson=${encodeURIComponent(lesson.id)}`} className="alt-link font-semibold shrink-0">Preview</Link>
                    )}
                    {lesson.durationSeconds ? <span className="text-xs alt-muted shrink-0">{formatDuration(lesson.durationSeconds)}</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function SellerPanel({ product }: { product: AltProduct }) {
  const { openMerchantChat } = useChat();
  const { data } = useAPI(product.merchantSlug ? `${API_BASE}/sellers/${product.merchantSlug}` : null);
  const seller = data as any;
  if (!product.merchantSlug) return null;
  const where = seller ? [seller.area, seller.state].filter(Boolean).join(", ") : "";

  return (
    <div className="alt-card p-4 grid gap-3">
      <p className="text-xs font-bold uppercase tracking-wider alt-muted">Sold by</p>
      <Link to={sellerPath(product.merchantSlug)} className="flex items-center gap-2 font-bold hover:underline min-w-0">
        <Store className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{product.merchantName}</span>
      </Link>
      {seller?.sellerReviewCount > 0 && (
        <p className="flex items-center gap-1.5 text-sm alt-soft">
          <Stars rating={seller.sellerAvgRating} size={13} /> {seller.sellerAvgRating} seller rating ({seller.sellerReviewCount})
        </p>
      )}
      {where && <p className="flex items-center gap-1.5 text-sm alt-soft"><MapPin className="h-4 w-4 shrink-0" aria-hidden /> Ships from {where}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Link to={sellerPath(product.merchantSlug)} className="alt-btn-ghost text-sm" style={{ minHeight: 40, padding: "0 10px" }}>Visit shop</Link>
        {product.merchantId && (
          <button type="button" onClick={() => openMerchantChat(product.merchantId!, product.merchantName ?? "")}
            className="alt-btn-ghost text-sm" style={{ minHeight: 40, padding: "0 10px" }}>
            <MessageCircle className="h-4 w-4" aria-hidden /> Chat
          </button>
        )}
      </div>
    </div>
  );
}

export function AltProductPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user, authHeader } = useAuth();
  const { products: catalog } = useCatalog();
  const [quantity, setQuantity] = useState(1);
  // The phone bar appears once the main Add to cart has scrolled away.
  const buyRef = useRef<HTMLDivElement>(null);
  const [buyInView, setBuyInView] = useState(true);

  const { data, loading, error } = useAPI(`${API_BASE}/products/${id}`);
  const product = data as AltProduct | null;
  const { data: courseData } = useAPI(
    product?.productType === "course" ? `${API_BASE}/learn/${id}?guestId=${encodeURIComponent(getGuestId())}` : null,
    user ? { headers: authHeader } : {}
  );
  const course = courseData as any;

  useEffect(() => setQuantity(1), [id]);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBuyInView(e.isIntersecting || e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, [product?.id]);
  useEffect(() => {
    if (!product?.id) return;
    rememberViewed(product.id);
    return trackInsight("view", product.id);
  }, [product?.id]);

  if (loading) {
    return (
      <div className="alt-wrap py-6 grid gap-6 md:grid-cols-2" aria-busy="true">
        <div className="alt-skel aspect-square rounded-2xl" />
        <div className="grid gap-3 content-start">
          <div className="alt-skel h-4 w-1/3" /><div className="alt-skel h-8 w-5/6" /><div className="alt-skel h-8 w-1/3" />
          <div className="alt-skel h-24 w-full" /><div className="alt-skel h-11 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="alt-wrap py-16 grid justify-items-center gap-3 text-center">
        <Package className="h-12 w-12 alt-muted" aria-hidden />
        <h1 className="text-2xl font-extrabold">We can't find that product</h1>
        <p className="alt-soft">It may have been removed or sold out for good.</p>
        <Link to={altPath("/search")} className="alt-btn">Browse all products</Link>
      </div>
    );
  }

  const physical = isPhysical(product.productType);
  const ticket = product.productType === "ticket";
  const emptyCourse = product.productType === "course" && !product.lessonCount;
  const off = saving(product);
  const stock = product.stockQuantity;
  const maxQty = physical && stock != null && stock > 0 ? stock : 99;
  const canBuy = product.inStock && !emptyCourse;
  const category = product.categories?.[0];

  const add = (andCheckout = false) => {
    addItem(product, physical ? quantity : 1);
    if (andCheckout) {
      navigate("/checkout");
      return;
    }
    toast.success(physical && quantity > 1 ? `Added ${quantity} × ${product.name} to cart` : `Added ${product.name} to cart`,
      { action: { label: "View cart", onClick: () => navigate(altPath("/cart")) } });
  };

  const fromShop = catalog.filter((p) => p.merchantSlug && p.merchantSlug === product.merchantSlug && p.id !== product.id).slice(0, 12);
  const similar = catalog.filter((p) => p.id !== product.id && category && p.categories?.includes(category) && !fromShop.includes(p)).slice(0, 12);
  const recent = recentlyViewed(catalog, product.id);

  const buyBox = ticket ? (
    <div id="tickets" className="scroll-mt-28"><TicketPicker product={product} /></div>
  ) : course?.enrolled ? (
    <Link to={`/learn/${id}?token=${encodeURIComponent(course.token)}`} className="alt-btn w-full">
      <GraduationCap className="h-5 w-5" aria-hidden /> Go to course
    </Link>
  ) : (
    <div className="grid gap-2">
      <div className="flex gap-2">
        {physical && (
          <div className="flex items-center rounded-[10px] shrink-0" style={{ border: "1px solid var(--a-line)" }}>
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}
              className="h-11 w-11 inline-flex items-center justify-center disabled:opacity-40" aria-label="One fewer"><Minus className="h-4 w-4" /></button>
            <span className="w-8 text-center font-bold tabular-nums" aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty}
              className="h-11 w-11 inline-flex items-center justify-center disabled:opacity-40" aria-label="One more"><Plus className="h-4 w-4" /></button>
          </div>
        )}
        <button type="button" onClick={() => add()} disabled={!canBuy} className="alt-btn flex-1">
          {emptyCourse ? "Enrolment opens soon" : !product.inStock ? "Sold out" : "Add to cart"}
        </button>
      </div>
      {canBuy && <button type="button" onClick={() => add(true)} className="alt-btn-ghost w-full">Buy now</button>}
    </div>
  );

  return (
    <div className="pb-24 md:pb-8">
      <nav aria-label="Breadcrumb" className="alt-wrap pt-4 text-sm">
        <ol className="flex items-center gap-1 alt-muted min-w-0">
          <li><Link to={altPath()} className="hover:underline">Home</Link></li>
          {category && (
            <>
              <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
              <li className="shrink-0"><Link to={`${altPath("/search")}?category=${encodeURIComponent(category)}`} className="hover:underline">{category}</Link></li>
            </>
          )}
          <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
          <li className="truncate alt-soft" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="alt-wrap pt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] items-start">
        <div className="grid gap-3 min-w-0">
          <Gallery media={product.media} fallback={product.image} alt={product.name} />
          <div className="hidden md:block"><Share name={product.name} /></div>
        </div>

        <div className="grid gap-3 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {!physical && <span className="alt-tag alt-tag-info">{productTypeLabel(product.productType)}</span>}
            {product.badge && <span className="alt-tag alt-tag-plain">{product.badge}</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {product.merchantSlug && (
              <Link to={sellerPath(product.merchantSlug)} className="alt-link font-semibold">{product.merchantName}</Link>
            )}
            {!!product.reviewCount && product.avgRating != null && (
              <a href="#reviews" className="flex items-center gap-1.5 alt-soft hover:underline">
                <Stars rating={product.avgRating} size={14} /> {product.avgRating} ({product.reviewCount} review{product.reviewCount === 1 ? "" : "s"})
              </a>
            )}
          </div>
          {product.eventStartsAt && <p className="text-sm alt-soft">{formatEventTime(product.eventStartsAt)} WAT</p>}

          <div className="grid gap-0.5 py-1">
            <div className="flex items-baseline flex-wrap gap-x-3">
              <span className="alt-price text-3xl">{ticket && <span className="text-sm font-semibold alt-muted">from </span>}{naira(product.price)}</span>
              {off && <span className="alt-was text-lg">{naira(off.was)}</span>}
            </div>
            {off && <p className="text-sm alt-save">You save {naira(off.amount)} ({off.percent}%)</p>}
          </div>

          {physical && (
            product.inStock ? (
              <p className="text-sm font-semibold" style={{ color: "var(--a-good)" }}>
                In stock{stock != null && stock <= 20 ? ` · ${stock} left` : ""}
              </p>
            ) : (
              <p className="text-sm font-semibold" style={{ color: "var(--a-bad)" }}>Sold out</p>
            )
          )}

          <div ref={buyRef}>{buyBox}</div>

          {product.description && (
            <section className="grid gap-2 pt-3" style={{ borderTop: "1px solid var(--a-line)" }}>
              <h2 className="font-extrabold">About this item</h2>
              <p className="text-[15px] alt-soft whitespace-pre-line leading-relaxed">{product.description}</p>
            </section>
          )}
        </div>

        <aside className="grid gap-3 min-w-0 md:col-span-2 lg:col-span-1" aria-label="Payment and seller">
          <div className="alt-card p-4 grid gap-3 text-sm">
            {physical ? (
              <>
                {product.codEligible ? (
                  <p className="flex gap-2.5"><Truck className="h-5 w-5 shrink-0" style={{ color: "var(--a-good)" }} aria-hidden />
                    <span><b>Pay on delivery available.</b> <span className="alt-soft">Pay when your order arrives.</span></span></p>
                ) : (
                  <p className="flex gap-2.5"><CreditCard className="h-5 w-5 shrink-0 alt-muted" aria-hidden />
                    <span><b>Pay online.</b> <span className="alt-soft">Not available for pay on delivery.</span></span></p>
                )}
                <p className="flex gap-2.5"><Package className="h-5 w-5 shrink-0 alt-muted" aria-hidden />
                  <span className="alt-soft">Delivery details and address are taken at checkout.</span></p>
              </>
            ) : (
              <p className="flex gap-2.5"><Zap className="h-5 w-5 shrink-0" style={{ color: "var(--a-accent)" }} aria-hidden />
                <span><b>{ticket ? "Tickets by email." : "Instant access."}</b>{" "}
                  <span className="alt-soft">{ticket ? "Your tickets arrive by email and in your Library." : "It appears in your Library after payment, and we email you a link."}</span></span></p>
            )}
            <p className="flex gap-2.5"><BadgeCheck className="h-5 w-5 shrink-0 alt-muted" aria-hidden />
              <span className="alt-soft">Every charge is shown before you pay, with nothing added after.</span></p>
          </div>
          <SellerPanel product={product} />
          <div className="md:hidden"><Share name={product.name} /></div>
        </aside>
      </div>

      <div className="alt-wrap pt-8"><div className="grid gap-8 max-w-3xl">
        {course && course.lessonCount > 0 && <CourseContents course={course} productId={id} />}
        <Reviews productId={id} />
      </div></div>

      {fromShop.length > 0 && (
        <Rail title={`More from ${product.merchantName}`} seeAll={product.merchantSlug ? sellerPath(product.merchantSlug) : undefined}>
          {fromShop.map((p) => <AltProductCard key={p.id} product={p} showSeller={false} />)}
        </Rail>
      )}
      {similar.length > 0 && (
        <Rail title="Similar products" seeAll={`${altPath("/search")}?category=${encodeURIComponent(category!)}`}>
          {similar.map((p) => <AltProductCard key={p.id} product={p} />)}
        </Rail>
      )}
      {recent.length > 0 && (
        <Rail title="Recently viewed">
          {recent.map((p) => <AltProductCard key={p.id} product={p} />)}
        </Rail>
      )}

      {/* Phones: price and the main action stay in reach. */}
      {!course?.enrolled && !buyInView && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-30"
          style={{ background: "var(--a-surface)", borderTop: "1px solid var(--a-line)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="alt-wrap py-2.5 flex items-center gap-3">
            <div className="min-w-0">
              <p className="alt-price text-lg leading-tight">{naira(product.price)}</p>
              {off ? <p className="text-xs alt-save">Save {off.percent}%</p> : physical && product.codEligible ? <p className="text-xs" style={{ color: "var(--a-good)" }}>Pay on delivery</p> : null}
            </div>
            {ticket ? (
              <a href="#tickets" className="alt-btn flex-1">Choose tickets</a>
            ) : (
              <button type="button" onClick={() => add()} disabled={!canBuy} className="alt-btn flex-1">
                {emptyCourse ? "Opens soon" : !product.inStock ? "Sold out" : physical && quantity > 1 ? `Add ${quantity} to cart` : "Add to cart"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
