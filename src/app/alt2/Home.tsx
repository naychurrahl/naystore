import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, MapPin, Store } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import type { HeroSlide } from "../components/HeroCarousel";
import { LoopRail } from "../components/LoopRail";
import { Testimonials } from "../components/Testimonials";
import { sponsoredAbove, type HomeShop } from "../home/useStoreHome";
import { SHOP_ALL, shopAllWith, useHomeRows, type HomeRow, type HouseCard } from "../home/useHomeRows";
import { useSellers } from "./sellers";
import {
  CardSkeleton, categoryUrl, m2, Monogram, naira, ProductCard, productUrl, saving, SectionHead, Stars, storeUrl, type AltProduct,
} from "./ui";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Campaign slides from the CMS; ones pointing at the company site (gallery,
// portfolio, blog) aren't shop campaigns and are left out.
function Banner({ slides, fallbackTitle, fallbackNote }: { slides: HeroSlide[]; fallbackTitle: string; fallbackNote?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);
  const slide = slides[Math.min(i, slides.length - 1)];

  if (!slide) {
    return (
      <div className="rounded-lg p-6 sm:p-10 grid content-end gap-2 min-h-[200px] sm:min-h-[300px]" style={{ background: "var(--m-band)", color: "var(--m-band-ink)" }}>
        <p className="text-3xl sm:text-4xl font-extrabold leading-tight max-w-lg">{fallbackTitle}</p>
        {fallbackNote && <p className="opacity-80 max-w-md">{fallbackNote}</p>}
      </div>
    );
  }
  const inner = (
    <div className="relative rounded-lg overflow-hidden min-h-[200px] sm:min-h-[300px] h-full grid content-end" style={{ background: "var(--m-band)" }}>
      <ImageWithFallback src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,14,11,0) 30%, rgba(8,14,11,0.82) 100%)" }} />
      <div className="relative p-5 sm:p-8 grid gap-2 text-white max-w-xl">
        <p className="text-2xl sm:text-4xl font-extrabold leading-[1.1]">{slide.heading}</p>
        {slide.subheading && <p className="text-sm sm:text-base opacity-90">{slide.subheading}</p>}
        {slide.ctaLabel && <span className="mt-1 justify-self-start inline-flex items-center gap-2 font-bold text-sm px-4 h-10 rounded-md" style={{ background: "#fff", color: "#111" }}>{slide.ctaLabel} <ArrowRight className="h-4 w-4" /></span>}
      </div>
      {slides.length > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          {[[-1, ChevronLeft, "Previous"], [1, ChevronRight, "Next"]].map(([d, Icon, label]: any) => (
            <button key={label} type="button" aria-label={`${label} slide`} onClick={(e) => { e.preventDefault(); setI((n) => (n + d + slides.length) % slides.length); }}
              className="h-8 w-8 rounded-full inline-flex items-center justify-center text-white" style={{ background: "rgba(0,0,0,0.4)" }}><Icon className="h-4 w-4" /></button>
          ))}
        </div>
      )}
    </div>
  );
  if (!slide.ctaLink) return inner;
  return slide.ctaLink.startsWith("/") ? <Link to={slide.ctaLink} className="block h-full">{inner}</Link>
    : <a href={slide.ctaLink} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>;
}

const productSlides = "basis-[46%] sm:basis-[31%] md:basis-1/4 lg:basis-1/5 xl:basis-1/6";
const arrow = { background: "var(--m-surface)", color: "var(--m-ink)", border: "1px solid var(--m-line)" };

function Rail({ products, loading, sponsoredIds, label }: { products: AltProduct[]; loading?: boolean; sponsoredIds: Set<string>; label: string }) {
  if (loading && products.length === 0) {
    return <div className="m2-rail m2-scroll">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>;
  }
  return <LoopRail label={label} items={products} keyOf={(p) => p.id} slideClass={productSlides} arrowStyle={arrow}
    render={(p) => <ProductCard product={p} sponsored={sponsoredIds.has(p.id)} />} />;
}

// A row of a ranked list; `rank` is left out for what was paid for, not earned.
function RankRow({ product: p, rank }: { product: AltProduct; rank?: number }) {
  return (
    <Link to={productUrl(p.id)} className="m2-panel m2-lift flex items-center gap-3 p-3 h-full">
      {rank != null && <span className="w-7 text-2xl font-extrabold m2-num text-center shrink-0" style={{ color: "var(--m-accent)" }}>{rank}</span>}
      <ImageWithFallback src={p.image} alt="" loading="lazy" className="h-16 w-16 rounded-md object-cover shrink-0" />
      <span className="min-w-0 grid gap-0.5">
        {rank == null && <span className="m2-badge m2-badge-plain justify-self-start">Sponsored</span>}
        <span className="text-sm font-semibold line-clamp-2 leading-snug">{p.name}</span>
        {!!p.reviewCount && p.avgRating != null && <span className="flex items-center gap-1 text-xs m2-ink3"><Stars rating={p.avgRating} size={11} /> {p.avgRating} ({p.reviewCount})</span>}
        <span className="m2-price text-[15px]">{naira(p.price)}</span>
      </span>
    </Link>
  );
}

// A numbered list: a different shape from the card rails around it. Sponsored
// products take the first spots, unnumbered; the numbers below them are real.
function Ranked({ products, sponsored, spots }: { products: AltProduct[]; sponsored: AltProduct[]; spots: number }) {
  const ranked = products.slice(0, 6);
  const paid = sponsoredAbove(ranked, sponsored, spots);
  return (
    <div className="grid gap-2">
      {paid.length > 0 && (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {paid.map((p) => <li key={p.id}><RankRow product={p} /></li>)}
        </ul>
      )}
      <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {ranked.map((p, i) => <li key={p.id}><RankRow product={p} rank={i + 1} /></li>)}
      </ol>
    </div>
  );
}

export function Home() {
  const { rows, loading, error, settings, storeName, allDeals, deals } = useHomeRows();
  const { data: slideData } = useAPI(`${API_BASE}/hero-slides`);
  const slides = ((slideData ?? []) as HeroSlide[]).filter((s) => !/^\/(gallery|portfolio|blog)\b/.test(s.ctaLink ?? ""));
  const profiles = useSellers(rows.flatMap((r) => (r.kind === "shops" ? r.shops.map((s) => s.slug) : [])));

  const shopCard = (s: HomeShop, sponsored: boolean) => {
    const pr = profiles.get(s.slug);
    const where = [pr?.area, pr?.state].filter(Boolean).join(", ");
    return (
      <Link to={storeUrl(s.slug)} className="m2-panel m2-lift overflow-hidden grid h-full">
        <span className="relative h-20 block" style={{ background: "var(--m-sunk)" }}>
          {pr?.bannerImage
            ? <ImageWithFallback src={pr.bannerImage} alt="" className="w-full h-full object-cover" />
            : <span className="grid grid-cols-3 h-full">{s.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />)}</span>}
          {sponsored && <span className="m2-badge m2-badge-plain absolute top-2 left-2">Sponsored</span>}
          <span className="absolute -bottom-5 left-3 rounded-md" style={{ border: "2px solid var(--m-surface)" }}><Monogram name={s.name} size={44} /></span>
        </span>
        <span className="px-3 pt-7 pb-3 grid gap-1">
          <span className="font-extrabold truncate">{s.name}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs m2-ink3">
            {pr && pr.sellerReviewCount > 0 && pr.sellerAvgRating != null && <span className="flex items-center gap-1"><Stars rating={pr.sellerAvgRating} size={11} /> {pr.sellerAvgRating} ({pr.sellerReviewCount})</span>}
            {where && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{where}</span>}
          </span>
          <span className="text-xs m2-ink2">{plural(s.items.length, "product")}</span>
        </span>
      </Link>
    );
  };
  const houseCard = (h: HouseCard) => (
    <Link to={h.to} className="m2-panel m2-lift overflow-hidden grid h-full">
      <span className="relative h-20 block" style={{ background: "var(--m-sunk)" }}>
        <span className="grid grid-cols-3 h-full">{h.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />)}</span>
        <span className="absolute -bottom-5 left-3 rounded-md" style={{ border: "2px solid var(--m-surface)" }}><Monogram name={h.name} size={44} /></span>
      </span>
      <span className="px-3 pt-7 pb-3 grid gap-1">
        <span className="font-extrabold truncate">{h.name}</span>
        <span className="text-xs m2-ink3">Our own store</span>
        <span className="text-xs m2-ink2">{plural(h.items.length, "product")}</span>
      </span>
    </Link>
  );

  const draw = (row: HomeRow) => {
    switch (row.kind) {
      case "banner":
        return (
          <section className="m2-wrap pt-4 grid gap-3 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
            <Banner slides={slides} fallbackTitle={storeName} fallbackNote={settings?.tagline} />
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <Link to={shopAllWith("deals=1&sort=discount")} className="rounded-lg p-4 grid content-between gap-3 m2-lift" style={{ background: "var(--m-deal-soft)", border: "1px solid var(--m-line)" }}>
                <span>
                  <span className="m2-badge m2-badge-deal">Today's deals</span>
                  <span className="block mt-2 font-extrabold text-lg leading-tight">{allDeals.length ? `Up to ${saving(allDeals[0])!.percent}% off` : "Deals"}</span>
                  <span className="block text-xs m2-ink2 mt-0.5">{loading ? "…" : plural(allDeals.length, "item")} on sale now</span>
                </span>
                <span className="flex -space-x-3">{(deals.length ? deals : allDeals).slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" className="h-12 w-12 rounded-full object-cover" style={{ border: "2px solid var(--m-surface)" }} />)}</span>
              </Link>
              <Link to={SHOP_ALL} className="rounded-lg p-4 grid content-between gap-3 m2-lift" style={{ background: "var(--m-accent-soft)", border: "1px solid var(--m-line)" }}>
                <span>
                  <Store className="h-6 w-6" style={{ color: "var(--m-accent)" }} aria-hidden />
                  <span className="block mt-2 font-extrabold text-lg leading-tight">Shop all</span>
                  <span className="block text-xs m2-ink2 mt-0.5">Every shop, one checkout</span>
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--m-accent)" }}>Browse →</span>
              </Link>
            </div>
          </section>
        );
      case "categories":
        return (
          <section className="m2-wrap">
            <SectionHead title={row.title} action={{ to: m2(row.seeAll), label: "All categories" }} />
            {loading && row.items.length === 0
              ? <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="m2-skel aspect-square" />)}</div>
              : <LoopRail label="categories" items={row.items} keyOf={(c) => c.name} slideClass="basis-[38%] sm:basis-[24%] lg:basis-1/6" arrowStyle={arrow} render={(c) => (
                <Link to={categoryUrl(c.name)} className="group grid gap-2">
                  <span className="relative aspect-square rounded-lg overflow-hidden" style={{ background: "var(--m-sunk)" }}>
                    <ImageWithFallback src={c.image} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                    {c.sponsored && <span className="m2-badge m2-badge-plain absolute top-2 left-2">Sponsored</span>}
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-[15px] truncate group-hover:underline">{c.name}</span>
                    <span className="text-xs m2-ink3 m2-num">{c.count}</span>
                  </span>
                </Link>
              )} />}
          </section>
        );
      case "shops": {
        const cards: ({ house: HouseCard } | { shop: HomeShop })[] = [...(row.house ? [{ house: row.house }] : []), ...row.shops.map((shop) => ({ shop }))];
        return (
          <section className="m2-wrap">
            <SectionHead title={row.title} note={row.note} />
            <LoopRail label={row.title.toLowerCase()} items={cards} keyOf={(c) => ("house" in c ? "house" : c.shop.slug)} arrowStyle={arrow}
              slideClass="basis-[78%] sm:basis-[44%] lg:basis-1/4" render={(c) => ("house" in c ? houseCard(c.house) : shopCard(c.shop, row.sponsored))} />
          </section>
        );
      }
      case "products": {
        const body = (
          <div className="m2-wrap">
            <SectionHead title={row.title} note={row.note} action={row.seeAll ? { to: row.seeAll, label: "See all" } : undefined} />
            <Rail label={row.title.toLowerCase()} products={row.products} loading={row.loading} sponsoredIds={row.sponsoredIds} />
          </div>
        );
        return row.band ? <section style={{ background: "var(--m-deal-soft)" }} className="py-6">{body}</section> : <section>{body}</section>;
      }
      case "ranked":
        return (
          <section className="m2-wrap">
            <SectionHead title={row.title} note={row.note} action={row.seeAll ? { to: row.seeAll, label: "See all" } : undefined} />
            {row.loading ? <div className="m2-skel h-48" /> : <Ranked products={row.products} sponsored={row.sponsored} spots={row.spots} />}
          </section>
        );
      case "collections":
        return (
          <section className="m2-wrap">
            <SectionHead title={row.title} />
            <LoopRail label="collections" items={row.items} keyOf={(c) => c.title} slideClass="basis-[85%] sm:basis-1/2 md:basis-1/3" arrowStyle={arrow} render={(c) => (
              <Link to={c.to} className="m2-panel m2-lift p-4 grid gap-3 group h-full">
                <span className="flex items-end justify-between gap-3">
                  <span>
                    <span className="block font-extrabold text-lg leading-tight group-hover:underline">{c.title}</span>
                    <span className="block text-xs m2-ink3">{c.note}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0" style={{ color: "var(--m-accent)" }} aria-hidden />
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
          <section className="m2-wrap">
            <SectionHead title={row.title} />
            <LoopRail label="recently viewed" items={row.products} keyOf={(p) => p.id} slideClass="basis-[30%] sm:basis-1/5 lg:basis-[12.5%]" arrowStyle={arrow} render={(p) => (
              <Link to={productUrl(p.id)} className="grid gap-1 group">
                <ImageWithFallback src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
                <span className="text-xs line-clamp-2 group-hover:underline">{p.name}</span>
                <span className="m2-price text-sm">{naira(p.price)}</span>
              </Link>
            )} />
          </section>
        );
      case "shopAll":
        return (
          <section className="m2-wrap">
            <Link to={SHOP_ALL} className="m2-panel m2-lift p-5 flex items-center gap-4 group">
              <span className="flex -space-x-3 shrink-0">{row.images.slice(0, 3).map((img, i) => <ImageWithFallback key={i} src={img} alt="" className="h-12 w-12 rounded-full object-cover" style={{ border: "2px solid var(--m-surface)" }} />)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-lg group-hover:underline">Shop all</span>
                <span className="block text-sm m2-ink2">{plural(row.count, "product")} from our store and every shop</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: "var(--m-accent)" }} aria-hidden />
            </Link>
          </section>
        );
      case "promises":
        return (
          <section className="m2-wrap">
            <ul className="grid sm:grid-cols-3 gap-3">
              {[
                ["One cart, one checkout", "Fill one cart from our store and any other shop and pay once. Each shop's part is tracked as its own order."],
                ["Ratings you can check", "Product and seller scores come from buyers' reviews."],
                ["Help when you need it", "Chat with us any time, and with a shop before you buy from it."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3 p-4 rounded-lg" style={{ background: "var(--m-sunk)" }}>
                  <BadgeCheck className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--m-accent)" }} aria-hidden />
                  <span><span className="block font-bold text-sm">{t}</span><span className="block text-sm m2-ink2">{d}</span></span>
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
    <div className="pb-10 grid grid-cols-[minmax(0,1fr)] gap-9 sm:gap-11">
      {error && <p className="m2-wrap pt-4" style={{ color: "var(--m-bad)" }}>We couldn't load products just now. Please refresh the page.</p>}
      {rows.map((row) => <div key={row.id} className="min-w-0">{draw(row)}</div>)}
    </div>
  );
}
