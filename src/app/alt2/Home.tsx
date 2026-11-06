import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, MapPin, Truck } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import type { HeroSlide } from "../components/HeroCarousel";
import { recentlyViewed } from "../alt/recent";
import { sponsoredAbove, useStoreHome, type HomeShop } from "../home/useStoreHome";
import { useSellers } from "./sellers";
import {
  CardSkeleton, categoryUrl, m2, Monogram, naira, ProductCard, productUrl, saving, SectionHead, Stars, storeUrl, type AltProduct,
} from "./ui";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const searchWith = (q: string) => `${m2("/search")}?${q}`;

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

function Rail({ products, loading, sponsoredIds }: { products: AltProduct[]; loading?: boolean; sponsoredIds: Set<string> }) {
  return (
    <div className="m2-rail m2-scroll">
      {loading ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />) : products.map((p) => <ProductCard key={p.id} product={p} sponsored={sponsoredIds.has(p.id)} />)}
    </div>
  );
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
  const {
    products, loading, error, settings, storeName, house, sponsored, sponsoredIds, shelf, deals, allDeals, topRated, categories, paidShops, firstShops, laterShops, featured, spots, best, bestLoading,
  } = useStoreHome();
  const { data: slideData } = useAPI(`${API_BASE}/hero-slides`);
  const slides = ((slideData ?? []) as HeroSlide[]).filter((s) => !/^\/(gallery|portfolio|blog)\b/.test(s.ctaLink ?? ""));
  const profiles = useSellers(paidShops.map((s) => s.slug));

  const recent = recentlyViewed(products);
  // "Picked for you": the categories of what this browser looked at lately.
  const recommended = useMemo(() => {
    const seen = new Set(recent.map((p) => p.id));
    const cats = new Set(recent.flatMap((p) => p.categories ?? []));
    return shelf.filter((p) => !seen.has(p.id) && p.categories?.some((c) => cats.has(c))).slice(0, 8);
  }, [shelf, recent]);

  const collections = [
    { title: `Under ${naira(10000)}`, note: "Small prices, same quality", q: "max=10000&sort=price-low", items: shelf.filter((p) => p.price < 10000) },
    { title: "Pay on delivery", note: "Pay when it arrives", q: "cod=1", items: shelf.filter((p) => p.codEligible && p.inStock) },
    { title: "Rated 4★ and up", note: "Loved by buyers", q: "rating=4&sort=rating", items: shelf.filter((p) => (p.reviewCount ?? 0) > 0 && (p.avgRating ?? 0) >= 4) },
  ].filter((c) => c.items.length >= 2);

  const shopCard = (s: HomeShop) => {
    const pr = profiles.get(s.slug);
    const where = [pr?.area, pr?.state].filter(Boolean).join(", ");
    return (
      <Link key={s.slug} to={storeUrl(s.slug)} className="m2-panel m2-lift overflow-hidden grid">
        <span className="relative h-20 block" style={{ background: "var(--m-sunk)" }}>
          {pr?.bannerImage
            ? <ImageWithFallback src={pr.bannerImage} alt="" className="w-full h-full object-cover" />
            : <span className="grid grid-cols-3 h-full">{s.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />)}</span>}
          <span className="m2-badge m2-badge-plain absolute top-2 left-2">Sponsored</span>
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

  return (
    <div className="pb-10 grid grid-cols-[minmax(0,1fr)] gap-9 sm:gap-11">
      {/* Featured banner, with two shortcuts beside it */}
      <section className="m2-wrap pt-4 grid gap-3 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Banner slides={slides} fallbackTitle={storeName} fallbackNote={settings?.tagline} />
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <Link to={searchWith("deals=1&sort=discount")} className="rounded-lg p-4 grid content-between gap-3 m2-lift" style={{ background: "var(--m-deal-soft)", border: "1px solid var(--m-line)" }}>
            <span>
              <span className="m2-badge m2-badge-deal">Today's deals</span>
              <span className="block mt-2 font-extrabold text-lg leading-tight">{allDeals.length ? `Up to ${saving(allDeals[0])!.percent}% off` : "Deals"}</span>
              <span className="block text-xs m2-ink2 mt-0.5">{loading ? "…" : plural(allDeals.length, "item")} on sale now</span>
            </span>
            <span className="flex -space-x-3">{(deals.length ? deals : allDeals).slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" className="h-12 w-12 rounded-full object-cover" style={{ border: "2px solid var(--m-surface)" }} />)}</span>
          </Link>
          <Link to={searchWith("cod=1")} className="rounded-lg p-4 grid content-between gap-3 m2-lift" style={{ background: "var(--m-accent-soft)", border: "1px solid var(--m-line)" }}>
            <span>
              <Truck className="h-6 w-6" style={{ color: "var(--m-accent)" }} aria-hidden />
              <span className="block mt-2 font-extrabold text-lg leading-tight">Pay on delivery</span>
              <span className="block text-xs m2-ink2 mt-0.5">On items marked for it</span>
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--m-accent)" }}>Browse →</span>
          </Link>
        </div>
      </section>

      {error && <p className="m2-wrap" style={{ color: "var(--m-bad)" }}>We couldn't load products just now. Please refresh the page.</p>}

      {/* Shop by category */}
      {(loading || categories.length > 0) && (
        <section className="m2-wrap">
          <SectionHead title="Shop by category" action={{ to: m2("/categories"), label: "All categories" }} />
          <div className="grid grid-flow-col auto-cols-[42%] sm:auto-cols-[24%] lg:auto-cols-fr gap-3 overflow-x-auto m2-scroll">
            {loading ? Array.from({ length: 5 }, (_, i) => <div key={i} className="m2-skel aspect-square" />) : categories.map((c) => (
              <Link key={c.name} to={categoryUrl(c.name)} className="group grid gap-2">
                <span className="relative aspect-square rounded-lg overflow-hidden" style={{ background: "var(--m-sunk)" }}>
                  <ImageWithFallback src={c.image} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                  {c.sponsored && <span className="m2-badge m2-badge-plain absolute top-2 left-2">Sponsored</span>}
                </span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-[15px] truncate group-hover:underline">{c.name}</span>
                  <span className="text-xs m2-ink3 m2-num">{c.count}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured shops: the sponsored spots, then the store's own, then any more that paid */}
      {(house.length > 0 || paidShops.length > 0) && (
        <section className="m2-wrap">
          <SectionHead title="Featured shops" />
          <div className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-[44%] lg:auto-cols-[calc((100%-36px)/4)] gap-3 overflow-x-auto m2-scroll">
            {firstShops.map(shopCard)}
            {house.length > 0 && (
              <Link to={searchWith("house=1")} className="m2-panel m2-lift overflow-hidden grid">
                <span className="relative h-20 block" style={{ background: "var(--m-sunk)" }}>
                  <span className="grid grid-cols-3 h-full">{house.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />)}</span>
                  <span className="absolute -bottom-5 left-3 rounded-md" style={{ border: "2px solid var(--m-surface)" }}><Monogram name={storeName || "Store"} size={44} /></span>
                </span>
                <span className="px-3 pt-7 pb-3 grid gap-1">
                  <span className="font-extrabold truncate">{storeName || "Our store"}</span>
                  <span className="text-xs m2-ink3">Our own store</span>
                  <span className="text-xs m2-ink2">{plural(house.length, "product")}</span>
                </span>
              </Link>
            )}
            {laterShops.map(shopCard)}
          </div>
        </section>
      )}

      {/* The store's best sellers (from real orders), or its top rated while there
          are too few; sponsored products take the first spots, unnumbered */}
      {(bestLoading || best.length >= 3) ? (
        <section className="m2-wrap">
          <SectionHead title="Best sellers" note="What buyers are ordering most" />
          {bestLoading ? <div className="m2-skel h-48" /> : <Ranked products={best} sponsored={sponsored} spots={spots} />}
        </section>
      ) : (topRated.length > 0 || sponsored.length > 0) && (
        <section className="m2-wrap">
          <SectionHead title="Top rated" note="Highest scores from buyers' reviews" action={{ to: searchWith("sort=rating"), label: "See all" }} />
          <Ranked products={topRated} sponsored={sponsored} spots={spots} />
        </section>
      )}

      {/* Today's deals, on their own band */}
      {(loading || deals.length > 0) && (
        <section style={{ background: "var(--m-deal-soft)" }} className="py-6">
          <div className="m2-wrap">
            <SectionHead title="Today's deals" note="Marked down from the seller's earlier price" action={{ to: searchWith("deals=1&sort=discount"), label: "See all deals" }} />
            <Rail products={deals.slice(0, 12)} loading={loading} sponsoredIds={sponsoredIds} />
          </div>
        </section>
      )}

      {/* Picked for you, or the store's featured picks for a first visit */}
      <section className="m2-wrap">
        {recommended.length >= 2
          ? <SectionHead title="Picked for you" note="Based on what you've looked at" />
          : <SectionHead title="Featured products" action={{ to: m2("/search"), label: "Browse all" }} />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)
            : (recommended.length >= 2 ? recommended : featured).map((p) => <ProductCard key={p.id} product={p} sponsored={sponsoredIds.has(p.id)} />)}
        </div>
      </section>

      {/* Collections: a short story, a few pictures, a way in */}
      {collections.length > 0 && (
        <section className="m2-wrap">
          <SectionHead title="Collections" />
          <div className="grid gap-3 md:grid-cols-3">
            {collections.map((c) => (
              <Link key={c.title} to={searchWith(c.q)} className="m2-panel m2-lift p-4 grid gap-3 group">
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
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed: small, it's a reminder */}
      {recent.length > 0 && (
        <section className="m2-wrap">
          <SectionHead title="Recently viewed" />
          <div className="flex gap-3 overflow-x-auto m2-scroll">
            {recent.map((p) => (
              <Link key={p.id} to={productUrl(p.id)} className="w-28 shrink-0 grid gap-1 group">
                <ImageWithFallback src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
                <span className="text-xs line-clamp-2 group-hover:underline">{p.name}</span>
                <span className="m2-price text-sm">{naira(p.price)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Why buy here, said once and plainly */}
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
    </div>
  );
}
