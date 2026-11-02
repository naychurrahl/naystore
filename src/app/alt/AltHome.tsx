import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, CreditCard, MessageCircle, Phone, Store, Truck } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import type { HeroSlide } from "../components/HeroCarousel";
import { AltProductCard } from "./AltProductCard";
import { altPath, CardSkeleton, contactsOf, saving, sellerPath, useCatalog, type AltProduct } from "./shared";
import { recentlyViewed } from "./recent";

export function Rail({ title, seeAll, children, loading }: { title: string; seeAll?: string; children: ReactNode; loading?: boolean }) {
  return (
    <section className="alt-wrap py-5 grid gap-3">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {seeAll && <Link to={seeAll} className="alt-link text-sm font-semibold shrink-0">See all →</Link>}
      </div>
      <div className="alt-rail alt-scroll">
        {loading ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />) : children}
      </div>
    </section>
  );
}

// Campaign slides from the CMS. Ones that point at the company site
// (gallery, portfolio, blog) aren't shop campaigns and are left out.
function Campaign({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);
  const slide = slides[Math.min(index, slides.length - 1)];
  if (!slide) return null;
  const internal = slide.ctaLink?.startsWith("/");

  const body = (
    <div className="relative h-full min-h-[180px] sm:min-h-[260px] rounded-2xl overflow-hidden" style={{ background: "var(--a-sunk)" }}>
      <ImageWithFallback src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(8,12,20,0.78) 0%, rgba(8,12,20,0.35) 60%, rgba(8,12,20,0) 100%)" }} />
      <div className="relative p-5 sm:p-8 max-w-md grid gap-2 text-white">
        <p className="text-2xl sm:text-3xl font-extrabold leading-tight">{slide.heading}</p>
        {slide.subheading && <p className="text-sm sm:text-base opacity-90">{slide.subheading}</p>}
        {slide.ctaLabel && <span className="mt-2 justify-self-start alt-btn" style={{ minHeight: 40 }}>{slide.ctaLabel}</span>}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          <button type="button" aria-label="Previous" onClick={(e) => { e.preventDefault(); setIndex((i) => (i - 1 + slides.length) % slides.length); }}
            className="h-8 w-8 rounded-full inline-flex items-center justify-center text-white" style={{ background: "rgba(0,0,0,0.45)" }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-white px-1 tabular-nums">{index + 1}/{slides.length}</span>
          <button type="button" aria-label="Next" onClick={(e) => { e.preventDefault(); setIndex((i) => (i + 1) % slides.length); }}
            className="h-8 w-8 rounded-full inline-flex items-center justify-center text-white" style={{ background: "rgba(0,0,0,0.45)" }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (!slide.ctaLink) return body;
  return internal
    ? <Link to={slide.ctaLink} className="block h-full">{body}</Link>
    : <a href={slide.ctaLink} target="_blank" rel="noopener noreferrer" className="block h-full">{body}</a>;
}

function Shortcut({ to, title, note, image }: { to: string; title: string; note: string; image?: string }) {
  return (
    <Link to={to} className="alt-card p-3 flex items-center gap-3 hover:shadow-[var(--a-shadow)] transition-shadow min-w-0">
      {image && <ImageWithFallback src={image} alt="" className="h-11 w-11 sm:h-14 sm:w-14 rounded-lg object-cover shrink-0" />}
      <span className="min-w-0">
        <span className="block font-bold leading-tight">{title}</span>
        <span className="block text-xs alt-muted leading-tight mt-0.5">{note}</span>
      </span>
    </Link>
  );
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function AltHome() {
  const { products, loading, error } = useCatalog();
  const { data: categoriesData } = useAPI(`${API_BASE}/categories?type=product`);
  const { data: bestData, loading: bestLoading } = useAPI(`${API_BASE}/best-sellers?limit=12`);
  const { data: slidesData } = useAPI(`${API_BASE}/hero-slides`);
  const { data: settings } = useAPI(`${API_BASE}/settings`);

  const categories = ((categoriesData ?? []) as any[]).map((c) => c.name as string);
  const slides = ((slidesData ?? []) as HeroSlide[]).filter((s) => !/^\/(gallery|portfolio|blog)\b/.test(s.ctaLink ?? ""));
  const best = (bestData ?? []) as AltProduct[];
  const { phone, whatsapp } = contactsOf(settings);

  const deals = useMemo(() => products.filter((p) => saving(p)).sort((a, b) => saving(b)!.percent - saving(a)!.percent), [products]);
  // The API lists products in the order shop owners arranged them.
  const featured = products.slice(0, 12);
  const tickets = products.filter((p) => p.productType === "ticket");
  const courses = products.filter((p) => p.productType === "course");
  const anyCod = products.some((p) => p.codEligible);
  const shops = useMemo(() => {
    const by = new Map<string, { slug: string; name: string; count: number; images: string[] }>();
    for (const p of products) {
      if (!p.merchantSlug) continue;
      const s = by.get(p.merchantSlug) ?? { slug: p.merchantSlug, name: p.merchantName ?? "", count: 0, images: [] };
      s.count++;
      if (s.images.length < 3 && p.image) s.images.push(p.image);
      by.set(p.merchantSlug, s);
    }
    return [...by.values()].sort((a, b) => b.count - a.count);
  }, [products]);
  const recent = recentlyViewed(products);

  const promises = [
    anyCod && { icon: Truck, title: "Pay on delivery", note: "On items marked for it" },
    { icon: CreditCard, title: "Secure online payment", note: "Paid through Paystack" },
    { icon: MessageCircle, title: "Chat with sellers", note: "Ask before you buy" },
    (phone || whatsapp) && { icon: Phone, title: whatsapp ? "WhatsApp or call us" : "Call to order", note: phone ?? "We're on WhatsApp" },
  ].filter(Boolean) as { icon: typeof Truck; title: string; note: string }[];

  return (
    <div className="pb-8">
      {categories.length > 0 && (
        <nav aria-label="Categories" style={{ background: "var(--a-surface)", borderBottom: "1px solid var(--a-line)" }}>
          <div className="alt-wrap flex gap-2 overflow-x-auto alt-scroll py-2.5">
            <Link to={altPath("/search")} className="alt-chip">All</Link>
            {categories.map((c) => (
              <Link key={c} to={`${altPath("/search")}?category=${encodeURIComponent(c)}`} className="alt-chip">{c}</Link>
            ))}
          </div>
        </nav>
      )}

      <section className="alt-wrap pt-4 grid gap-3 lg:grid-cols-[2fr_1fr]">
        {slides.length > 0 ? <Campaign slides={slides} /> : (
          <div className="rounded-2xl p-6 sm:p-8 grid content-center gap-2" style={{ background: "var(--a-accent-soft)" }}>
            <p className="text-2xl sm:text-3xl font-extrabold">{settings?.companyName}</p>
            {settings?.tagline && <p className="alt-soft">{settings.tagline}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 content-start">
          {deals.length > 0 && <Shortcut to={`${altPath("/search")}?deals=1&sort=discount`} title="Deals" note={plural(deals.length, "item") + " on offer"} image={deals[0].image} />}
          <Shortcut to={altPath("/search")} title="All products" note={loading ? "Browse everything" : plural(products.length, "product")} image={featured[0]?.image} />
          {tickets.length > 0 && <Shortcut to={`${altPath("/search")}?type=ticket`} title="Event tickets" note={plural(tickets.length, "event")} image={tickets[0].image} />}
          {courses.length > 0 && <Shortcut to={`${altPath("/search")}?type=course`} title="Online courses" note={plural(courses.length, "course")} image={courses[0].image} />}
        </div>
      </section>

      <section className="alt-wrap pt-4" aria-label="Why shop with us">
        <ul className="alt-card grid grid-cols-2 lg:grid-cols-4">
          {promises.map(({ icon: Icon, title, note }, i) => (
            <li key={title} className="flex items-center gap-3 p-3 sm:p-4 min-w-0"
              style={{ borderLeft: i % 2 ? "1px solid var(--a-line)" : undefined, borderTop: i >= 2 ? "1px solid var(--a-line)" : undefined }}>
              <Icon className="h-5 w-5 shrink-0" style={{ color: "var(--a-accent)" }} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{title}</span>
                <span className="block text-xs alt-muted leading-tight mt-0.5">{note}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="alt-wrap pt-6" style={{ color: "var(--a-bad)" }}>We couldn't load products just now. Please refresh the page.</p>
      )}

      {(loading || deals.length > 0) && (
        <Rail title="Deals" seeAll={`${altPath("/search")}?deals=1&sort=discount`} loading={loading}>
          {deals.slice(0, 12).map((p) => <AltProductCard key={p.id} product={p} />)}
        </Rail>
      )}

      {(bestLoading || best.length > 0) && (
        <Rail title="Best sellers" loading={bestLoading}>
          {best.map((p) => <AltProductCard key={p.id} product={p} />)}
        </Rail>
      )}

      {shops.length > 0 && (
        <section className="alt-wrap py-5 grid gap-3">
          <h2 className="text-xl font-extrabold">Shops on {settings?.companyName ?? "the store"}</h2>
          <div className="alt-rail alt-scroll">
            {shops.map((s) => (
              <Link key={s.slug} to={sellerPath(s.slug)} className="alt-card p-3 grid gap-2 hover:shadow-[var(--a-shadow)] transition-shadow">
                <div className="grid grid-cols-3 gap-1">
                  {s.images.map((img, i) => <ImageWithFallback key={i} src={img} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
                </div>
                <span className="flex items-center gap-1.5 font-bold text-sm min-w-0">
                  <Store className="h-4 w-4 shrink-0 alt-muted" aria-hidden /><span className="truncate">{s.name}</span>
                </span>
                <span className="text-xs alt-muted">{plural(s.count, "product")}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="alt-wrap py-5 grid gap-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-extrabold">Featured</h2>
          <Link to={altPath("/search")} className="alt-link text-sm font-semibold">See all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />) : featured.map((p) => <AltProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {recent.length > 0 && (
        <Rail title="Recently viewed">
          {recent.map((p) => <AltProductCard key={p.id} product={p} />)}
        </Rail>
      )}
    </div>
  );
}
