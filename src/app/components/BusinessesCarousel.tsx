import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Boxes } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";

// Portfolio/Gallery/Blog are content types, not businesses - Shop is the one
// fixed vertical that is a business, kept static here. The rest of "Our
// Businesses" is just Portfolio's own categories: each one groups a set of
// portfolio projects under a business name, so they double as businesses.
const STATIC_BUSINESSES = [
  { icon: ShoppingBag, title: "E-commerce Store", description: "Browse our curated selection of premium products", link: "/#shop", color: 'var(--color-primary)' },
];

export function BusinessesCarousel() {
  const { data } = useAPI(`${API_BASE}/categories?type=portfolio`);
  const portfolioCategories = (data ?? []) as any[];

  const dynamicBusinesses = portfolioCategories.map((category) => ({
    icon: Boxes,
    title: category.name,
    description: `Explore our ${category.name} projects`,
    link: `/portfolio?category=${encodeURIComponent(category.name)}`,
    color: 'var(--color-primary)',
  }));

  const businesses = [...STATIC_BUSINESSES, ...dynamicBusinesses];

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(track.scrollLeft < track.scrollWidth - track.clientWidth - 4);
  };

  useEffect(() => {
    updateArrows();
  }, [businesses.length]);

  if (businesses.length === 0) return null;

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
      <style>{`
        .businesses-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .businesses-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Explore Our Businesses
          </h2>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Discover what we have to offer across our diverse portfolio
          </p>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow transition-opacity ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
        >
          <ChevronLeft className="h-5 w-5" style={{ color: 'var(--color-text-primary)' }} />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow transition-opacity ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
        >
          <ChevronRight className="h-5 w-5" style={{ color: 'var(--color-text-primary)' }} />
        </button>

        <div
          ref={trackRef}
          className="businesses-scroll flex gap-6 overflow-x-auto overflow-y-hidden px-4 sm:px-6 lg:px-8 scroll-smooth"
          onScroll={updateArrows}
        >
          {businesses.map((biz, index) => {
            const Icon = biz.icon;
            return (
              <Link
                key={`${biz.title}-${index}`}
                to={biz.link}
                className="w-72 shrink-0 p-6 rounded-xl transition-all duration-300 group"
                style={{
                  backgroundColor: 'var(--color-product-card)',
                  border: '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: biz.color, opacity: 0.1 }}
                >
                  <Icon className="h-6 w-6" style={{ color: biz.color }} />
                </div>
                <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {biz.title}
                </h3>
                <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {biz.description}
                </p>
                <div
                  className="flex items-center font-medium group-hover:gap-2 transition-all"
                  style={{ color: biz.color }}
                >
                  Explore
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
