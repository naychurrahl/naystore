import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, CreditCard, MessageCircle, Phone, Store, Truck } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import type { HeroSlide } from "../components/HeroCarousel";
import { AltProductCard } from "./AltProductCard";
import { LoopRail } from "../components/LoopRail";
import { Testimonials } from "../components/Testimonials";
import { sponsoredAbove, type HomeShop } from "../home/useStoreHome";
import { SHOP_ALL, shopAllWith, useHomeRows, type HomeRow, type HouseCard } from "../home/useHomeRows";
import { altPath, CardSkeleton, contactsOf, sellerPath } from "./shared";

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

const productSlides = "basis-[46%] sm:basis-1/3 md:basis-1/4 lg:basis-1/6";
const arrow = { background: "var(--a-surface)", color: "var(--a-ink)", border: "1px solid var(--a-line)" };

function Head({ title, note, seeAll }: { title: string; note?: string; seeAll?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <span className="min-w-0">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {note && <p className="text-sm alt-muted">{note}</p>}
      </span>
      {seeAll && <Link to={seeAll} className="alt-link text-sm font-semibold shrink-0">See all →</Link>}
    </div>
  );
}

export function AltHome() {
  const { rows, products, loading, error, settings, storeName, deals, allDeals, featured } = useHomeRows();
  const { data: slidesData } = useAPI(`${API_BASE}/hero-slides`);
  const slides = ((slidesData ?? []) as HeroSlide[]).filter((s) => !/^\/(gallery|portfolio|blog)\b/.test(s.ctaLink ?? ""));
  const { phone, whatsapp } = contactsOf(settings);

  const tickets = products.filter((p) => p.productType === "ticket");
  const courses = products.filter((p) => p.productType === "course");
  const anyCod = products.some((p) => p.codEligible);
  const shopImages = (items: { image?: string }[]) => items.filter((p) => p.image).slice(0, 3).map((p) => p.image!);

  const shopCard = (s: HomeShop, sponsored: boolean) => (
    <Link to={sellerPath(s.slug)} className="alt-card p-3 grid gap-2 h-full hover:shadow-[var(--a-shadow)] transition-shadow">
      <div className="grid grid-cols-3 gap-1">
        {shopImages(s.items).map((img, i) => <ImageWithFallback key={i} src={img} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
      </div>
      <span className="flex items-center gap-1.5 font-bold text-sm min-w-0">
        <Store className="h-4 w-4 shrink-0 alt-muted" aria-hidden /><span className="truncate">{s.name}</span>
      </span>
      <span className="text-xs alt-muted flex items-center gap-1.5">{sponsored && <span className="alt-tag alt-tag-plain">Sponsored</span>} {plural(s.items.length, "product")}</span>
    </Link>
  );
  const houseCard = (h: HouseCard) => (
    <Link to={h.to} className="alt-card p-3 grid gap-2 h-full hover:shadow-[var(--a-shadow)] transition-shadow">
      <div className="grid grid-cols-3 gap-1">
        {shopImages(h.items).map((img, i) => <ImageWithFallback key={i} src={img} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
      </div>
      <span className="flex items-center gap-1.5 font-bold text-sm min-w-0">
        <Store className="h-4 w-4 shrink-0 alt-muted" aria-hidden /><span className="truncate">{h.name}</span>
      </span>
      <span className="text-xs alt-muted">Our own store · {plural(h.items.length, "product")}</span>
    </Link>
  );

  const promises = [
    anyCod && { icon: Truck, title: "Pay on delivery", note: "On items marked for it" },
    { icon: CreditCard, title: "Secure online payment", note: "Paid through Paystack" },
    { icon: MessageCircle, title: "Chat with sellers", note: "Ask before you buy" },
    (phone || whatsapp) && { icon: Phone, title: whatsapp ? "WhatsApp or call us" : "Call to order", note: phone ?? "We're on WhatsApp" },
  ].filter(Boolean) as { icon: typeof Truck; title: string; note: string }[];

  const draw = (row: HomeRow) => {
    switch (row.kind) {
      case "banner":
        return (
          <section className="alt-wrap pt-4 grid gap-3 lg:grid-cols-[2fr_1fr]">
            {slides.length > 0 ? <Campaign slides={slides} /> : (
              <div className="rounded-2xl p-6 sm:p-8 grid content-center gap-2" style={{ background: "var(--a-accent-soft)" }}>
                <p className="text-2xl sm:text-3xl font-extrabold">{storeName}</p>
                {settings?.tagline && <p className="alt-soft">{settings.tagline}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 content-start">
              {allDeals.length > 0 && <Shortcut to={shopAllWith("deals=1&sort=discount")} title="Deals" note={plural(allDeals.length, "item") + " on offer"} image={(deals[0] ?? allDeals[0]).image} />}
              <Shortcut to={SHOP_ALL} title="Shop all" note={loading ? "Browse everything" : plural(products.length, "product")} image={featured[0]?.image} />
              {tickets.length > 0 && <Shortcut to={shopAllWith("type=ticket")} title="Event tickets" note={plural(tickets.length, "event")} image={tickets[0].image} />}
              {courses.length > 0 && <Shortcut to={shopAllWith("type=course")} title="Online courses" note={plural(courses.length, "course")} image={courses[0].image} />}
            </div>
          </section>
        );
      case "categories":
        return (
          <section className="alt-wrap py-5 grid gap-3">
            <Head title={row.title} />
            {loading && row.items.length === 0
              ? <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
              : <LoopRail label="categories" items={row.items} keyOf={(c) => c.name} slideClass="basis-[38%] sm:basis-1/4 lg:basis-1/6" arrowStyle={arrow} render={(c) => (
                <Link to={altPath(`/c/${encodeURIComponent(c.name)}`)} className="alt-card overflow-hidden grid h-full group">
                  <span className="relative aspect-square block" style={{ background: "var(--a-sunk)" }}>
                    <ImageWithFallback src={c.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                    {c.sponsored && <span className="alt-tag alt-tag-plain absolute top-2 left-2">Sponsored</span>}
                  </span>
                  <span className="p-2.5 flex items-baseline justify-between gap-2">
                    <span className="font-bold text-sm truncate group-hover:underline">{c.name}</span>
                    <span className="text-xs alt-muted tabular-nums">{c.count}</span>
                  </span>
                </Link>
              )} />}
          </section>
        );
      case "shops": {
        const cards: ({ house: HouseCard } | { shop: HomeShop })[] = [...(row.house ? [{ house: row.house }] : []), ...row.shops.map((shop) => ({ shop }))];
        return (
          <section className="alt-wrap py-5 grid gap-3">
            <Head title={row.title} note={row.note} />
            <LoopRail label={row.title.toLowerCase()} items={cards} keyOf={(c) => ("house" in c ? "house" : c.shop.slug)} arrowStyle={arrow}
              slideClass="basis-[70%] sm:basis-[40%] lg:basis-1/5" render={(c) => ("house" in c ? houseCard(c.house) : shopCard(c.shop, row.sponsored))} />
          </section>
        );
      }
      case "products": {
        const body = (
          <div className="alt-wrap py-5 grid gap-3">
            <Head title={row.title} note={row.note} seeAll={row.seeAll} />
            {row.loading && row.products.length === 0
              ? <div className="alt-rail alt-scroll">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
              : <LoopRail label={row.title.toLowerCase()} items={row.products} keyOf={(p) => p.id} slideClass={productSlides} arrowStyle={arrow}
                render={(p) => <AltProductCard product={p} sponsored={row.sponsoredIds.has(p.id)} />} />}
          </div>
        );
        return row.band ? <section style={{ background: "var(--a-sunk)" }}>{body}</section> : <section>{body}</section>;
      }
      case "ranked": {
        const paid = sponsoredAbove(row.products, row.sponsored, row.spots);
        const items = [...paid.map((p) => ({ p, paid: true })), ...row.products.map((p) => ({ p, paid: false }))];
        return (
          <section className="alt-wrap py-5 grid gap-3">
            <Head title={row.title} note={row.note} seeAll={row.seeAll} />
            {row.loading
              ? <div className="alt-rail alt-scroll">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
              : <LoopRail label={row.title.toLowerCase()} items={items} keyOf={(x) => (x.paid ? "paid-" : "") + x.p.id} slideClass={productSlides} arrowStyle={arrow}
                render={(x) => <AltProductCard product={x.p} sponsored={x.paid} />} />}
          </section>
        );
      }
      case "collections":
        return (
          <section className="alt-wrap py-5 grid gap-3">
            <Head title={row.title} />
            <LoopRail label="collections" items={row.items} keyOf={(c) => c.title} slideClass="basis-[85%] sm:basis-1/2 md:basis-1/3" arrowStyle={arrow} render={(c) => (
              <Link to={c.to} className="alt-card p-4 grid gap-3 h-full group hover:shadow-[var(--a-shadow)] transition-shadow">
                <span>
                  <span className="block font-extrabold text-lg leading-tight group-hover:underline">{c.title}</span>
                  <span className="block text-xs alt-muted">{c.note}</span>
                </span>
                <span className="grid grid-cols-3 gap-2">
                  {c.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
                </span>
              </Link>
            )} />
          </section>
        );
      case "recent":
        return (
          <section className="alt-wrap py-5 grid gap-3">
            <Head title={row.title} />
            <LoopRail label="recently viewed" items={row.products} keyOf={(p) => p.id} slideClass={productSlides} arrowStyle={arrow} render={(p) => <AltProductCard product={p} />} />
          </section>
        );
      case "shopAll":
        return (
          <section className="alt-wrap py-5">
            <Link to={SHOP_ALL} className="alt-card p-5 flex items-center gap-4 group hover:shadow-[var(--a-shadow)] transition-shadow">
              <span className="flex -space-x-3 shrink-0">{row.images.slice(0, 3).map((img, i) => <ImageWithFallback key={i} src={img} alt="" className="h-12 w-12 rounded-full object-cover" style={{ border: "2px solid var(--a-surface)" }} />)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-lg group-hover:underline">Shop all</span>
                <span className="block text-sm alt-muted">{plural(row.count, "product")} from our store and every shop</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--a-accent)" }} aria-hidden />
            </Link>
          </section>
        );
      case "promises":
        return (
          <section className="alt-wrap py-5" aria-label="Why shop with us">
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
        );
      case "testimonials":
        return <Testimonials />;
    }
  };

  return (
    <div className="pb-8">
      {error && <p className="alt-wrap pt-6" style={{ color: "var(--a-bad)" }}>We couldn't load products just now. Please refresh the page.</p>}
      {rows.map((row) => <div key={row.id} className="min-w-0">{draw(row)}</div>)}
    </div>
  );
}
