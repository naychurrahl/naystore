import { useState, useMemo } from "react";
import { products, productCategories } from "../../data.js";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ShoppingCart, Filter } from "lucide-react";

export function Shop() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");

  const filteredProducts = useMemo(() => {
    let filtered = selectedCategory === "All" 
      ? products 
      : products.filter(p => p.category === selectedCategory);

    // Sort products
    if (sortBy === "price-low") {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [selectedCategory, sortBy]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-primary)' }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-2">Our Shop</h1>
          <p className="text-white opacity-90">Discover premium products for every need</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
            <div className="flex flex-wrap gap-2">
              {productCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  style={{
                    backgroundColor: selectedCategory === category 
                      ? 'var(--color-primary)' 
                      : 'white',
                    color: selectedCategory === category 
                      ? 'white' 
                      : 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)'
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
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-xl overflow-hidden transition-all duration-300 group"
              style={{ 
                backgroundColor: 'var(--color-product-card)',
                border: '1px solid var(--color-border)'
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
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
                <ImageWithFallback
                  src={`https://source.unsplash.com/400x400/?${encodeURIComponent(product.image)}`}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.badge && (
                  <div
                    className="absolute top-2 right-2 px-2 py-1 rounded text-white text-xs font-medium"
                    style={{ 
                      backgroundColor: product.inStock 
                        ? 'var(--color-product-badge)' 
                        : 'var(--color-text-secondary)'
                    }}
                  >
                    {product.badge}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {product.category}
                </p>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {product.name}
                </h3>
                <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                      ${product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="ml-2 text-sm line-through" style={{ color: 'var(--color-text-muted)' }}>
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>
                  <button
                    disabled={!product.inStock}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50"
                    style={{ 
                      backgroundColor: product.inStock ? 'var(--color-cart-button)' : 'var(--color-border)',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      if (product.inStock) {
                        e.currentTarget.style.backgroundColor = 'var(--color-cart-button-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (product.inStock) {
                        e.currentTarget.style.backgroundColor = 'var(--color-cart-button)';
                      }
                    }}
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
