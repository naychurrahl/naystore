import { Link } from "react-router";
import { toast } from "sonner";
import { ShoppingCart, Star } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useCart } from "../context/CartContext";

export interface ShopProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  categories: string[];
  description: string;
  badge?: string;
  inStock: boolean;
  codEligible: boolean;
  avgRating?: number;
  reviewCount?: number;
}

export function ProductCard({ product }: { product: ShopProduct }) {
  const { addItem } = useCart();

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300 group"
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
      <Link
        to={`/shop/${product.id}`}
        className="relative aspect-square overflow-hidden block"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.badge && (
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded text-white text-xs font-medium"
            style={{
              backgroundColor: product.inStock ? 'var(--color-product-badge)' : 'var(--color-text-secondary)',
            }}
          >
            {product.badge}
          </div>
        )}
        <div
          className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: product.inStock ? 'var(--color-success-light)' : 'var(--color-error-light)',
            color: product.inStock ? 'var(--color-success)' : 'var(--color-error)',
          }}
        >
          {product.inStock ? "In Stock" : "Out of Stock"}
        </div>
      </Link>

      <div className="p-4">
        <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {product.categories?.join(", ")}
        </p>
        <Link to={`/shop/${product.id}`}>
          <h3 className="font-semibold mb-1 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-1 mb-2">
          {product.reviewCount ? (
            <>
              <Star className="h-3.5 w-3.5" fill="var(--color-accent)" style={{ color: 'var(--color-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {product.avgRating} ({product.reviewCount})
              </span>
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No rating
            </span>
          )}
        </div>
        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
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
            onClick={() => {
              addItem(product, 1);
              toast.success(`Added ${product.name} to cart`);
            }}
            className="p-2 rounded-lg transition-colors disabled:opacity-50"
            style={{
              backgroundColor: product.inStock ? 'var(--color-cart-button)' : 'var(--color-border)',
              color: 'white',
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
  );
}
