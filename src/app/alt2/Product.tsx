import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  Award, ChevronLeft, ChevronRight, ClipboardCheck, Copy, CreditCard, FileText, GraduationCap, Headphones, Lock, MapPin,
  MessageCircle, Minus, Package, PlayCircle, Plus, Search, ShieldCheck, Store, Truck, X, Zap,
} from "lucide-react";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
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
import { recentlyViewed, rememberViewed } from "../alt/recent";
import { useShopState } from "./local";
import { useSellers } from "./sellers";
import {
  availability, categoryUrl, EmptyState, m2, Monogram, naira, ProductCard, saving, SectionHead, Stars, storeUrl, toneColor,
  useAddToCart, useCatalog, WishButton, type AltProduct,
} from "./ui";

type Media = { type: "image" | "video"; url: string };

function Viewer({ items, start, alt, onClose }: { items: Media[]; start: number; alt: string; onClose: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: start * el.clientWidth });
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const t = track.current;
        if (t) t.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * t.clientWidth, behavior: "smooth" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [start, onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#0b0d0c" }} role="dialog" aria-modal="true" aria-label={`${alt} photos`}>
      <div className="flex items-center justify-between px-4 h-14 text-white" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <span className="text-sm m2-num">{i + 1} / {items.length}</span>
        <button type="button" onClick={onClose} aria-label="Close photos" className="h-11 w-11 inline-flex items-center justify-center"><X className="h-6 w-6" /></button>
      </div>
      <div ref={track} className="flex-1 flex overflow-x-auto snap-x snap-mandatory m2-scroll"
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}>
        {items.map((m, n) => (
          <div key={n} className="snap-center shrink-0 w-full h-full flex items-center justify-center p-2">
            {m.type === "video" ? <video src={m.url} controls playsInline className="max-w-full max-h-full" />
              : <ImageWithFallback src={m.url} alt={`${alt}, photo ${n + 1}`} className="max-w-full max-h-full object-contain" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Thumbnails beside the photo on desktop, under it on phones; hover to
// zoom on desktop, tap for full screen; swipe on phones.
function Gallery({ media, fallback, alt }: { media?: Media[]; fallback: string; alt: string }) {
  const items: Media[] = media?.length ? media : [{ type: "image", url: fallback }];
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [viewer, setViewer] = useState(false);
  const closeViewer = useCallback(() => setViewer(false), []);
  const track = useRef<HTMLDivElement>(null);
  const go = (n: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    setI(n);
  };
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const current = items[i];

  return (
    <div className="grid gap-2 lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-3 min-w-0">
      {items.length > 1 && (
        <div className="order-2 lg:order-1 flex lg:flex-col gap-2 overflow-auto m2-scroll lg:max-h-[560px]">
          {items.map((m, n) => (
            <button key={n} type="button" onClick={() => go(n)} onMouseEnter={() => setI(n)} aria-label={`Show ${m.type} ${n + 1}`}
              className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden"
              style={{ outline: n === i ? "2px solid var(--m-accent)" : "1px solid var(--m-line)", outlineOffset: n === i ? 1 : -1 }}>
              {m.type === "video" ? <><video src={m.url} muted preload="metadata" className="w-full h-full object-cover" /><PlayCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" /></>
                : <ImageWithFallback src={m.url} alt="" className="w-full h-full object-cover" />}
            </button>
          ))}
        </div>
      )}
      <div className={`order-1 lg:order-2 relative ${items.length > 1 ? "" : "lg:col-span-2"}`}>
        {/* Phones and tablets: swipe */}
        <div ref={track} className="lg:hidden flex overflow-x-auto snap-x snap-mandatory m2-scroll rounded-lg aspect-square" style={{ background: "var(--m-sunk)" }}
          onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}>
          {items.map((m, n) => (
            <button key={n} type="button" className="snap-start shrink-0 w-full h-full" onClick={() => setViewer(true)} aria-label="Open photos full screen">
              {m.type === "video" ? <video src={m.url} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
                : <ImageWithFallback src={m.url} alt={n === 0 ? alt : `${alt}, photo ${n + 1}`} className="w-full h-full object-cover" />}
            </button>
          ))}
        </div>
        {/* Desktop: hover to zoom */}
        <div className="hidden lg:block relative aspect-square rounded-lg overflow-hidden" style={{ background: "var(--m-sunk)", cursor: current.type === "image" ? "zoom-in" : undefined }}
          onMouseMove={current.type === "image" ? onMove : undefined} onMouseLeave={() => setZoom(null)} onClick={() => setViewer(true)}>
          {current.type === "video" ? <video key={current.url} src={current.url} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
            : <ImageWithFallback src={current.url} alt={alt} className="w-full h-full object-cover transition-transform duration-150"
                style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />}
          {!zoom && current.type === "image" && (
            <span className="absolute bottom-3 left-3 m2-badge m2-badge-plain" style={{ opacity: 0.9 }}><Search className="h-3 w-3" /> Hover to zoom · click to enlarge</span>
          )}
        </div>
        {items.length > 1 && (
          <>
            <span className="lg:hidden absolute bottom-3 right-3 m2-badge m2-num" style={{ background: "var(--m-scrim)", color: "#fff" }}>{i + 1}/{items.length}</span>
            <div className="hidden lg:flex absolute inset-x-2 top-1/2 -translate-y-1/2 justify-between pointer-events-none">
              {[[-1, ChevronLeft, "Previous"], [1, ChevronRight, "Next"]].map(([d, Icon, label]: any) => (
                <button key={label} type="button" aria-label={`${label} photo`} onClick={(e) => { e.stopPropagation(); setI((n) => (n + d + items.length) % items.length); }}
                  className="pointer-events-auto h-9 w-9 rounded-full inline-flex items-center justify-center shadow" style={{ background: "var(--m-surface)" }}><Icon className="h-5 w-5" /></button>
              ))}
            </div>
          </>
        )}
      </div>
      {viewer && <Viewer items={items} start={i} alt={alt} onClose={closeViewer} />}
    </div>
  );
}

function Reviews({ productId, count }: { productId: string; count: number }) {
  const { user, authHeader } = useAuth();
  const { openLogin } = useAuthModal();
  const location = useLocation();
  const { data, refetch } = useAPI(`${API_BASE}/reviews?productId=${productId}`);
  const reviews = (data ?? []) as any[];
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dist = [5, 4, 3, 2, 1].map((s) => [s, reviews.filter((r) => r.rating === s).length] as const);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post(`${API_BASE}/reviews`, { productId, ...form }, { headers: authHeader });
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
    <section id="reviews" className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 scroll-mt-32">
      <div className="grid gap-3 content-start">
        <h2 className="text-xl font-extrabold">Customer reviews</h2>
        {reviews.length > 0 ? (
          <>
            <p className="flex items-center gap-2"><span className="text-3xl font-extrabold m2-num">{avg.toFixed(1)}</span><Stars rating={avg} size={16} /></p>
            <p className="text-sm m2-ink3">{count || reviews.length} review{(count || reviews.length) === 1 ? "" : "s"}</p>
            <ul className="grid gap-1">
              {dist.map(([s, n]) => (
                <li key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-6 m2-num">{s}★</span>
                  <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--m-sunk)" }}>
                    <span className="block h-full" style={{ width: `${(n / reviews.length) * 100}%`, background: "var(--m-star)" }} />
                  </span>
                  <span className="w-5 text-right m2-num m2-ink3">{n}</span>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="text-sm m2-ink2">No reviews yet.</p>}
        {user ? (
          <form onSubmit={submit} className="m2-panel p-3 grid gap-2">
            <p className="font-bold text-sm">Review this product</p>
            <div className="flex gap-0.5" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setForm({ ...form, rating: n })} className="p-0.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={n <= form.rating ? "var(--m-star)" : "none"} stroke="var(--m-star)" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                </button>
              ))}
            </div>
            <textarea required rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="What did you think?" aria-label="Your review" className="m2-input" />
            {err && <p className="text-sm" style={{ color: "var(--m-bad)" }}>{err}</p>}
            <button type="submit" disabled={busy} className="m2-btn m2-btn-sm justify-self-start">{busy ? "Posting…" : "Post review"}</button>
          </form>
        ) : (
          <button type="button" className="m2-btn-line" onClick={() => openLogin(location.pathname)}>Log in to write a review</button>
        )}
      </div>
      <div className="grid gap-3 content-start">
        {reviews.map((r) => (
          <article key={r.id} className="pb-3 grid gap-1" style={{ borderBottom: "1px solid var(--m-line)" }}>
            <div className="flex items-center gap-2"><Stars rating={r.rating} size={13} /><span className="font-semibold text-sm">{r.customerName}</span></div>
            <p className="text-xs m2-ink3">{new Date(r.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
            <p className="text-[15px] m2-ink2 whitespace-pre-line">{r.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Course({ course, id }: { course: any; id: string }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-extrabold">Course content</h2>
      <p className="text-sm m2-ink3">
        {course.modules.length} module{course.modules.length === 1 ? "" : "s"} · {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
        {course.durationSeconds ? ` · ${formatDuration(course.durationSeconds)} of video` : ""}
      </p>
      {course.certificateEnabled && <p className="text-sm flex items-center gap-1.5 m2-ink2"><Award className="h-4 w-4" aria-hidden /> Certificate of completion included</p>}
      <div className="m2-panel overflow-hidden">
        {course.modules.map((mod: any, mi: number) => (
          <div key={mod.id} style={{ borderTop: mi ? "1px solid var(--m-line)" : undefined }}>
            <p className="px-4 py-3 font-semibold text-sm" style={{ background: "var(--m-sunk)" }}>{mi + 1}. {mod.title}</p>
            <ul>{mod.lessons.map((l: any) => {
              const Icon = l.locked ? Lock : l.hasVideo ? PlayCircle : l.hasQuiz ? ClipboardCheck : FileText;
              return (
                <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm" style={{ borderTop: "1px solid var(--m-line)" }}>
                  <Icon className="h-4 w-4 shrink-0 m2-ink3" aria-hidden /><span className="flex-1 min-w-0 truncate m2-ink2">{l.title}</span>
                  {l.isPreview && !course.enrolled && <Link to={`/learn/${id}?lesson=${encodeURIComponent(l.id)}`} className="m2-link shrink-0">Preview</Link>}
                  {l.durationSeconds ? <span className="text-xs m2-ink3 shrink-0">{formatDuration(l.durationSeconds)}</span> : null}
                </li>
              );
            })}</ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const add = useAddToCart();
  const { user, authHeader } = useAuth();
  const { openMerchantChat, open: openSupport } = useChat();
  const { products: catalog } = useCatalog();
  const myState = useShopState();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"about" | "reviews">("about");
  const buyRef = useRef<HTMLDivElement>(null);
  const [buyVisible, setBuyVisible] = useState(true);

  const { data, loading, error } = useAPI(`${API_BASE}/products/${id}`);
  const product = data as AltProduct | null;
  const { data: courseData } = useAPI(product?.productType === "course" ? `${API_BASE}/learn/${id}?guestId=${encodeURIComponent(getGuestId())}` : null, user ? { headers: authHeader } : {});
  const course = courseData as any;
  const seller = useSellers([product?.merchantSlug]).get(product?.merchantSlug ?? "") ?? null;

  useEffect(() => { setQty(1); setTab("about"); }, [id]);
  useEffect(() => {
    if (!product?.id) return;
    rememberViewed(product.id);
    return trackInsight("view", product.id);
  }, [product?.id]);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBuyVisible(e.isIntersecting || e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, [product?.id]);

  if (loading) {
    return (
      <div className="m2-wrap py-6 grid gap-6 lg:grid-cols-2" aria-busy="true">
        <div className="m2-skel aspect-square" />
        <div className="grid gap-3 content-start"><div className="m2-skel h-8 w-5/6" /><div className="m2-skel h-5 w-1/3" /><div className="m2-skel h-10 w-1/2" /><div className="m2-skel h-24" /><div className="m2-skel h-11" /></div>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="m2-wrap py-10">
        <EmptyState icon={<Package className="h-10 w-10" />} title="We can't find that product" action={<Link to={m2("/search")} className="m2-btn">Browse products</Link>}>
          It may have been removed by the seller.
        </EmptyState>
      </div>
    );
  }

  const physical = isPhysical(product.productType);
  const ticket = product.productType === "ticket";
  const emptyCourse = product.productType === "course" && !product.lessonCount;
  const off = saving(product);
  const stock = availability(product);
  const maxQty = physical && product.stockQuantity != null && product.stockQuantity > 0 ? product.stockQuantity : 99;
  const canBuy = product.inStock && !emptyCourse;
  const category = product.categories?.[0];
  const where = [seller?.area, seller?.state].filter(Boolean).join(", ");
  const sameState = !!myState && seller?.state === myState;
  const fromShop = catalog.filter((p) => p.merchantSlug && p.merchantSlug === product.merchantSlug && p.id !== product.id).slice(0, 12);
  const similar = catalog.filter((p) => p.id !== product.id && category && p.categories?.includes(category) && !fromShop.includes(p)).slice(0, 12);
  const recent = recentlyViewed(catalog, product.id);
  const reviewCount = product.reviewCount ?? 0;

  const share = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => toast.success("Link copied"), () => toast.error("Couldn't copy - use the address bar"));
  };

  const buy = (
    <div ref={buyRef} className="grid gap-2">
      {ticket ? <div id="tickets" className="scroll-mt-32"><TicketPicker product={product} /></div>
        : course?.enrolled ? <Link to={`/learn/${id}?token=${encodeURIComponent(course.token)}`} className="m2-btn w-full"><GraduationCap className="h-5 w-5" /> Go to course</Link>
        : (
          <>
            {physical && canBuy && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">Quantity</span>
                <div className="flex items-center rounded-md" style={{ border: "1px solid var(--m-line-strong)" }}>
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="h-10 w-10 inline-flex items-center justify-center disabled:opacity-35" aria-label="One fewer"><Minus className="h-4 w-4" /></button>
                  <span className="w-9 text-center font-bold m2-num" aria-live="polite">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} className="h-10 w-10 inline-flex items-center justify-center disabled:opacity-35" aria-label="One more"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="button" onClick={() => add(product, physical ? qty : 1)} disabled={!canBuy} className="m2-btn">
                {emptyCourse ? "Enrolment opens soon" : !product.inStock ? "Sold out" : "Add to cart"}
              </button>
              <WishButton product={product} className="h-11 w-11 m2-btn-line !p-0 !rounded-md" size={19} />
            </div>
            {canBuy && <button type="button" className="m2-btn-line" onClick={() => { add(product, physical ? qty : 1); navigate(m2("/checkout")); }}>Buy now</button>}
          </>
        )}
    </div>
  );

  return (
    <div className="pb-24 lg:pb-10">
      <nav aria-label="Breadcrumb" className="m2-wrap pt-4 text-sm m2-ink3">
        <ol className="flex items-center gap-1 min-w-0">
          <li><Link to={m2()} className="hover:underline">Home</Link></li>
          {category && <><li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li><li className="shrink-0"><Link to={categoryUrl(category)} className="hover:underline">{category}</Link></li></>}
          <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li><li className="truncate m2-ink2" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="m2-wrap pt-4 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_300px] lg:gap-8 items-start">
        <Gallery media={product.media} fallback={product.image} alt={product.name} />

        <div className="grid gap-3 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {!physical && <span className="m2-badge m2-badge-accent">{productTypeLabel(product.productType)}</span>}
            {product.badge && <span className="m2-badge m2-badge-plain">{product.badge}</span>}
          </div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold leading-tight">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {reviewCount > 0 && product.avgRating != null
              ? <a href="#reviews" onClick={() => setTab("reviews")} className="flex items-center gap-1.5 hover:underline"><Stars rating={product.avgRating} size={14} /> <span className="m2-num">{product.avgRating}</span> <span className="m2-ink3">({reviewCount} review{reviewCount === 1 ? "" : "s"})</span></a>
              : <span className="m2-ink3">No reviews yet</span>}
            {product.merchantSlug && <span className="m2-ink3">· Sold by <Link to={storeUrl(product.merchantSlug)} className="m2-link">{product.merchantName}</Link></span>}
          </div>
          {product.eventStartsAt && <p className="text-sm m2-ink2">{formatEventTime(product.eventStartsAt)} WAT</p>}

          <div className="py-3 grid gap-1" style={{ borderTop: "1px solid var(--m-line)", borderBottom: "1px solid var(--m-line)" }}>
            <div className="flex items-baseline flex-wrap gap-x-3">
              <span className="m2-price text-[32px] leading-none">{ticket && <span className="text-sm font-semibold m2-ink3">from </span>}{naira(product.price)}</span>
              {off && <><span className="m2-was">{naira(off.was)}</span><span className="m2-badge m2-badge-deal">−{off.percent}%</span></>}
            </div>
            {off && <p className="text-sm font-semibold" style={{ color: "var(--m-good)" }}>You save {naira(off.amount)}</p>}
            <p className="text-sm font-semibold" style={{ color: toneColor[stock.tone] }}>{stock.text}{physical && product.inStock && product.stockQuantity != null && product.stockQuantity > 5 && product.stockQuantity <= 20 ? ` · ${product.stockQuantity} left` : ""}</p>
          </div>

          {buy}

          <div className="flex flex-wrap items-center gap-2 text-sm pt-1">
            <a className="m2-chip" style={{ height: 32 }} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${product.name} ${window.location.href}`)}`}>Share on WhatsApp</a>
            <button type="button" className="m2-chip" style={{ height: 32 }} onClick={share}><Copy className="h-3.5 w-3.5" /> Copy link</button>
          </div>
        </div>

        <aside className="grid gap-3 min-w-0 lg:sticky lg:top-[136px]" aria-label="Seller and marketplace">
          {product.merchantSlug && (
            <section className="m2-panel p-4 grid gap-3" aria-labelledby="m2-seller">
              <p id="m2-seller" className="m2-eyebrow">The seller</p>
              <Link to={storeUrl(product.merchantSlug)} className="flex items-center gap-3 min-w-0 group">
                <Monogram name={product.merchantName ?? ""} size={40} />
                <span className="min-w-0">
                  <span className="block font-extrabold truncate group-hover:underline">{product.merchantName}</span>
                  {seller && seller.sellerReviewCount > 0 && seller.sellerAvgRating != null
                    ? <span className="flex items-center gap-1 text-xs m2-ink3"><Stars rating={seller.sellerAvgRating} size={11} /> {seller.sellerAvgRating} seller rating ({seller.sellerReviewCount})</span>
                    : <span className="text-xs m2-ink3">No seller ratings yet</span>}
                </span>
              </Link>
              {physical && where && (
                <p className="flex gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 mt-0.5 m2-ink3" aria-hidden />
                  <span>Ships from <b>{where}</b>{sameState && <span className="block text-xs" style={{ color: "var(--m-good)" }}>Same state as you</span>}</span></p>
              )}
              {physical && (
                <p className="flex gap-2 text-sm"><Truck className="h-4 w-4 shrink-0 mt-0.5 m2-ink3" aria-hidden />
                  <span>{product.codEligible ? <><b>Pay on delivery</b> available from this seller.</> : <>This seller takes <b>online payment</b> for this item.</>}</span></p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link to={storeUrl(product.merchantSlug)} className="m2-btn-line m2-btn-sm"><Store className="h-4 w-4" /> Visit shop</Link>
                {product.merchantId && <button type="button" className="m2-btn-line m2-btn-sm" onClick={() => openMerchantChat(product.merchantId!, product.merchantName ?? "")}><MessageCircle className="h-4 w-4" /> Ask seller</button>}
              </div>
            </section>
          )}
          <section className="rounded-lg p-4 grid gap-3 text-sm" style={{ background: "var(--m-sunk)" }} aria-labelledby="m2-market">
            <p id="m2-market" className="m2-eyebrow">From the marketplace</p>
            <p className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--m-accent)" }} aria-hidden />
              <span>Online payments go through <b>Paystack</b> or <b>Naylet</b>. Every charge shows before you pay.</span></p>
            {!physical && <p className="flex gap-2"><Zap className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--m-accent)" }} aria-hidden />
              <span>{ticket ? "Tickets arrive by email and in your Library." : "Access arrives in your Library right after payment, with an email link."}</span></p>}
            <p className="flex gap-2"><CreditCard className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--m-accent)" }} aria-hidden />
              <span>One checkout for everything in your cart, from any shop.</span></p>
            <p className="flex gap-2"><Headphones className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--m-accent)" }} aria-hidden />
              <span>A problem with an order? Report it from <Link to="/orders" className="m2-link">your orders</Link>, or <button type="button" className="m2-link" onClick={openSupport}>chat with us</button>.</span></p>
          </section>
        </aside>
      </div>

      <div className="m2-wrap pt-10 grid grid-cols-[minmax(0,1fr)] gap-6">
        <div role="tablist" aria-label="Product information" className="flex gap-6" style={{ borderBottom: "1px solid var(--m-line)" }}>
          {([["about", "Description"], ["reviews", `Reviews${reviewCount ? ` (${reviewCount})` : ""}`]] as const).map(([k, label]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}
              className="pb-3 -mb-px font-bold text-[15px]" style={{ borderBottom: tab === k ? "2px solid var(--m-accent)" : "2px solid transparent", color: tab === k ? "var(--m-ink)" : "var(--m-ink-3)" }}>
              {label}
            </button>
          ))}
        </div>
        {tab === "about" ? (
          <div className="grid gap-6 max-w-3xl">
            {product.description ? <p className="text-[15px] leading-relaxed m2-ink2 whitespace-pre-line">{product.description}</p> : <p className="m2-ink3">The seller hasn't added a description.</p>}
            {course && course.lessonCount > 0 && <Course course={course} id={id} />}
          </div>
        ) : <Reviews productId={id} count={reviewCount} />}
      </div>

      {fromShop.length > 0 && (
        <section className="m2-wrap pt-10">
          <SectionHead title={`More from ${product.merchantName}`} action={product.merchantSlug ? { to: storeUrl(product.merchantSlug), label: "Visit shop" } : undefined} />
          <div className="m2-rail m2-scroll">{fromShop.map((p) => <ProductCard key={p.id} product={p} showStore={false} />)}</div>
        </section>
      )}
      {similar.length > 0 && (
        <section className="m2-wrap pt-10">
          <SectionHead title="You may also like" action={{ to: categoryUrl(category!), label: `More in ${category}` }} />
          <div className="m2-rail m2-scroll">{similar.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
      {recent.length > 0 && (
        <section className="m2-wrap pt-10">
          <SectionHead title="Recently viewed" />
          <div className="m2-rail m2-scroll">{recent.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {/* Phones: price and the main action stay in reach once the buttons scroll away */}
      {!course?.enrolled && !buyVisible && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 m2-pop" style={{ background: "var(--m-surface)", borderTop: "1px solid var(--m-line)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="m2-wrap py-2 flex items-center gap-3">
            <div className="min-w-0">
              <p className="m2-price text-lg leading-tight">{naira(product.price)}</p>
              <p className="text-xs font-semibold" style={{ color: toneColor[stock.tone] }}>{stock.text}</p>
            </div>
            {ticket ? <a href="#tickets" className="m2-btn flex-1">Choose tickets</a>
              : <button type="button" onClick={() => add(product, physical ? qty : 1)} disabled={!canBuy} className="m2-btn flex-1">{!product.inStock ? "Sold out" : qty > 1 ? `Add ${qty} to cart` : "Add to cart"}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
