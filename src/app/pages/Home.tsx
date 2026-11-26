import { Link } from "react-router";
import { ArrowRight, Store } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { HeroCarousel, type HeroSlide } from "../components/HeroCarousel";
import { LoopRail } from "../components/LoopRail";
import { ProductCard, type ShopProduct } from "../components/ProductCard";
import { Testimonials } from "../components/Testimonials";
import { TrustStrip } from "../components/TrustStrip";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { sponsoredAbove, type HomeShop } from "../home/useStoreHome";
import { SHOP_ALL, useHomeRows, type HomeRow, type HouseCard } from "../home/useHomeRows";

// The Classic theme's home: the same rows as every theme (home/useHomeRows),
// in this theme's look.
const productSlides = "basis-1/2 md:basis-1/3 lg:basis-1/4";
const arrow = { backgroundColor: 'var(--color-product-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const card = { backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' };

function Head({ title, note, seeAll }: { title: string; note?: string; seeAll?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <span className="min-w-0">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
        {note && <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{note}</p>}
      </span>
      {seeAll && <Link to={seeAll} className="text-sm font-semibold shrink-0 hover:underline" style={{ color: 'var(--color-primary)' }}>See all →</Link>}
    </div>
  );
}

const Section = ({ children, alt }: { children: React.ReactNode; alt?: boolean }) => (
  <section className="py-10" style={{ backgroundColor: alt ? 'var(--color-surface-alt)' : 'var(--color-surface)' }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);

function Loading() {
  return <p style={{ color: 'var(--color-text-secondary)' }}>Loading products...</p>;
}

export function Home() {
  const { rows, error } = useHomeRows();
  const { data: slidesData } = useAPI(`${API_BASE}/hero-slides`);
  const slides = ((slidesData ?? []) as HeroSlide[]).filter((s) => !/^\/(gallery|portfolio|blog)\b/.test(s.ctaLink ?? ""));

  const shopCard = (s: HomeShop, sponsored: boolean) => (
    <Link to={`/sellers/${s.slug}`} className="rounded-xl p-4 grid gap-3 h-full" style={card}>
      <span className="grid grid-cols-3 gap-1">
        {s.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
      </span>
      <span className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sponsored ? "Sponsored · " : ""}{plural(s.items.length, "product")}</span>
    </Link>
  );
  const houseCard = (h: HouseCard) => (
    <Link to={h.to} className="rounded-xl p-4 grid gap-3 h-full" style={card}>
      <span className="grid grid-cols-3 gap-1">
        {h.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
      </span>
      <span className="font-semibold truncate flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}><Store className="h-4 w-4 shrink-0" aria-hidden />{h.name}</span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Our own store · {plural(h.items.length, "product")}</span>
    </Link>
  );
  const products = (label: string, list: ShopProduct[], sponsored: (p: ShopProduct) => boolean, key = (p: ShopProduct) => p.id) => (
    <LoopRail label={label} items={list} keyOf={key} slideClass={productSlides} arrowStyle={arrow}
      render={(p) => <ProductCard product={p} sponsored={sponsored(p)} />} />
  );

  const draw = (row: HomeRow, i: number) => {
    const alt = i % 2 === 1;
    switch (row.kind) {
      case "banner":
        return <HeroCarousel slides={slides} />;
      case "categories":
        return (
          <Section alt={alt}>
            <Head title={row.title} />
            <LoopRail label="categories" items={row.items} keyOf={(c) => c.name} slideClass="basis-[40%] sm:basis-1/4 lg:basis-1/6" arrowStyle={arrow} render={(c) => (
              <Link to={`/c/${encodeURIComponent(c.name)}`} className="group grid gap-2">
                <span className="relative aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                  <ImageWithFallback src={c.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {c.sponsored && <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full" style={card}>Sponsored</span>}
                </span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold truncate group-hover:underline" style={{ color: 'var(--color-text-primary)' }}>{c.name}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.count}</span>
                </span>
              </Link>
            )} />
          </Section>
        );
      case "shops": {
        const cards: ({ house: HouseCard } | { shop: HomeShop })[] = [...(row.house ? [{ house: row.house }] : []), ...row.shops.map((shop) => ({ shop }))];
        return (
          <Section alt={alt}>
            <Head title={row.title} note={row.note} />
            <LoopRail label={row.title.toLowerCase()} items={cards} keyOf={(c) => ("house" in c ? "house" : c.shop.slug)} arrowStyle={arrow}
              slideClass="basis-[75%] sm:basis-1/2 lg:basis-1/4" render={(c) => ("house" in c ? houseCard(c.house) : shopCard(c.shop, row.sponsored))} />
          </Section>
        );
      }
      case "products":
        return (
          <Section alt={alt || row.band}>
            <Head title={row.title} note={row.note} seeAll={row.seeAll} />
            {row.loading && row.products.length === 0 ? <Loading /> : products(row.title.toLowerCase(), row.products as ShopProduct[], (p) => row.sponsoredIds.has(p.id))}
          </Section>
        );
      case "ranked": {
        const paid = sponsoredAbove(row.products, row.sponsored, row.spots);
        const paidIds = new Set(paid.map((p) => p.id));
        return (
          <Section alt={alt}>
            <Head title={row.title} note={row.note} seeAll={row.seeAll} />
            {row.loading ? <Loading /> : products(row.title.toLowerCase(), [...paid, ...row.products] as ShopProduct[], (p) => paidIds.has(p.id))}
          </Section>
        );
      }
      case "collections":
        return (
          <Section alt={alt}>
            <Head title={row.title} />
            <LoopRail label="collections" items={row.items} keyOf={(c) => c.title} slideClass="basis-[85%] sm:basis-1/2 md:basis-1/3" arrowStyle={arrow} render={(c) => (
              <Link to={c.to} className="rounded-xl p-4 grid gap-3 group h-full" style={card}>
                <span className="flex items-end justify-between gap-3">
                  <span>
                    <span className="block font-bold text-lg group-hover:underline" style={{ color: 'var(--color-text-primary)' }}>{c.title}</span>
                    <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.note}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden />
                </span>
                <span className="grid grid-cols-3 gap-2">
                  {c.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
                </span>
              </Link>
            )} />
          </Section>
        );
      case "recent":
        return (
          <Section alt={alt}>
            <Head title={row.title} />
            {products("recently viewed", row.products as ShopProduct[], () => false)}
          </Section>
        );
      case "shopAll":
        return (
          <Section alt={alt}>
            <Link to={SHOP_ALL} className="rounded-xl p-5 flex items-center gap-4 group" style={card}>
              <span className="flex -space-x-3 shrink-0">{row.images.slice(0, 3).map((img, n) => <ImageWithFallback key={n} src={img} alt="" className="h-12 w-12 rounded-full object-cover" style={{ border: '2px solid var(--color-product-card)' }} />)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-lg group-hover:underline" style={{ color: 'var(--color-text-primary)' }}>Shop all</span>
                <span className="block text-sm" style={{ color: 'var(--color-text-secondary)' }}>{plural(row.count, "product")} from our store and every shop</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden />
            </Link>
          </Section>
        );
      case "promises":
        return <TrustStrip />;
      case "testimonials":
        return <Testimonials />;
    }
  };

  return (
    <div>
      {error && <p className="max-w-7xl mx-auto px-4 pt-6" style={{ color: 'var(--color-error)' }}>Couldn't load products. Please try again later.</p>}
      {rows.map((row, i) => <div key={row.id} className="min-w-0">{draw(row, i)}</div>)}
    </div>
  );
}
