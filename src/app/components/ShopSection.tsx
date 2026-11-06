import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Filter } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { ProductRail } from "./ProductRail";
import { ProductCard, type ShopProduct } from "./ProductCard";
import { PageHeader } from "./PageHeader";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { sponsoredAbove, sponsoredFirst, sponsoredFor, storeFirst, useHomePromotions, useStoreHome, type HomeShop } from "../home/useStoreHome";

const HEADER_IMAGE = "https://www.sourcesplash.com/i/random?q=retail%20shopping%20store&w=1600&h=400";

export function ShopSection() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");

  const { products: catalogue, loading, error, storeName, house, sponsored, sponsoredIds, paidShops, firstShops, laterShops, spots, best } = useStoreHome();
  const promos = useHomePromotions();
  const { data: categoriesData } = useAPI(`${API_BASE}/categories?type=product`);

  const category = selectedCategory === "All" ? null : selectedCategory;
  // "Shop All" lists every shop, the store's own and what's promoted first.
  const products = useMemo(() => storeFirst(catalogue, promos, category) as ShopProduct[], [catalogue, promos, category]);
  const productCategories = ["All", ...((categoriesData ?? []) as any[]).map((c) => c.name)];
  // What's paid for takes the first spots, labelled, then the real ranking.
  const bestPaid = useMemo(() => sponsoredAbove(best.slice(0, 8), sponsored, spots), [best, sponsored, spots]);
  const bestSellers = useMemo(() => [...bestPaid, ...best.slice(0, 8)] as ShopProduct[], [bestPaid, best]);
  const bestSponsored = useMemo(() => new Set(bestPaid.map((p) => p.id)), [bestPaid]);

  const newArrivals = useMemo(() => sponsoredFirst([...house].slice(-8).reverse(), sponsored, spots) as ShopProduct[], [house, sponsored, spots]);
  // Only the default order is moved by being paid for, so only it says "Sponsored".
  const listSponsored = useMemo(() => (sortBy === "featured" ? sponsoredFor(promos, category) : new Set<string>()), [promos, category, sortBy]);

  const filteredProducts = useMemo(() => {
    let filtered = !category
      ? products
      : products.filter((p) => p.categories?.includes(category));

    if (sortBy === "price-low") {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, category, sortBy]);

  const shopCard = (s: HomeShop) => (
    <Link key={s.slug} to={`/sellers/${s.slug}`} className="rounded-xl p-4 grid gap-3" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
      <span className="grid grid-cols-3 gap-1">
        {s.items.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
      </span>
      <span className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sponsored</span>
    </Link>
  );

  return (
    <div id="shop" style={{ backgroundColor: 'var(--color-surface)' }}>
      <PageHeader
        title="Shop"
        subtitle="Browse our curated selection of premium products"
        image={HEADER_IMAGE}
        tint="rgba(37, 99, 235, 0.82)"
      />

      <ProductRail id="new-arrivals" title="New Arrivals" products={newArrivals} sponsoredIds={sponsoredIds} />
      <ProductRail id="best-sellers" title="Best Sellers" products={bestSellers} sponsoredIds={bestSponsored} />

      {(house.length > 0 || paidShops.length > 0) && (
        <section id="featured-shops" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 scroll-mt-20">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>Featured Shops</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {firstShops.map(shopCard)}
            {house.length > 0 && (
              <div className="rounded-xl p-4 grid gap-3" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
                <span className="grid grid-cols-3 gap-1">
                  {house.slice(0, 3).map((p) => <ImageWithFallback key={p.id} src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />)}
                </span>
                <span className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{storeName || "Our store"}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Our own store</span>
              </div>
            )}
            {laterShops.map(shopCard)}
          </div>
        </section>
      )}

      <div id="shop-products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 scroll-mt-20">
        <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
          Shop All
        </h3>

        {/* Filters */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Filter className="h-5 w-5 shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
            <div className="category-scroll flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible min-w-0 -mx-1 px-1 py-1 md:mx-0 md:px-0 md:py-0">
              {productCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="shrink-0 px-4 py-2 rounded-full transition-colors text-sm font-medium"
                  style={{
                    backgroundColor: selectedCategory === category
                      ? 'var(--color-primary)'
                      : 'var(--color-product-card)',
                    color: selectedCategory === category
                      ? 'var(--color-primary-ink)'
                      : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg border"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-product-card)',
            }}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        {/* Products Grid */}
        {loading && (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading products...</p>
        )}
        {error && (
          <p style={{ color: 'var(--color-error)' }}>Couldn't load products. Please try again later.</p>
        )}
        {!loading && !error && filteredProducts.length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)' }}>No products match your filters.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} sponsored={listSponsored.has(product.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
