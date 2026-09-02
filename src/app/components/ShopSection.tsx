import { useState, useMemo } from "react";
import { Filter } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { ProductRail } from "./ProductRail";
import { ProductCard, type ShopProduct } from "./ProductCard";
import { PageHeader } from "./PageHeader";

const HEADER_IMAGE = "https://www.sourcesplash.com/i/random?q=retail%20shopping%20store&w=1600&h=400";

export function ShopSection() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");

  const { data: productsData, loading, error } = useAPI(`${API_BASE}/products`);
  const { data: categoriesData } = useAPI(`${API_BASE}/categories?type=product`);
  const { data: bestSellersData } = useAPI(`${API_BASE}/best-sellers?limit=8`);

  const products = (productsData ?? []) as ShopProduct[];
  const productCategories = ["All", ...((categoriesData ?? []) as any[]).map((c) => c.name)];
  const bestSellers = (bestSellersData ?? []) as ShopProduct[];

  const newArrivals = useMemo(() => [...products].slice(-8).reverse(), [products]);

  const filteredProducts = useMemo(() => {
    let filtered = selectedCategory === "All"
      ? products
      : products.filter((p) => p.categories?.includes(selectedCategory));

    if (sortBy === "price-low") {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, selectedCategory, sortBy]);

  return (
    <div id="shop" style={{ backgroundColor: 'var(--color-surface)' }}>
      <PageHeader
        title="Shop"
        subtitle="Browse our curated selection of premium products"
        image={HEADER_IMAGE}
        tint="rgba(37, 99, 235, 0.82)"
      />

      <ProductRail id="new-arrivals" title="New Arrivals" products={newArrivals} />
      <ProductRail id="best-sellers" title="Best Sellers" products={bestSellers} />

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
                      ? 'white'
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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
