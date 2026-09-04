import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Minus, Plus, Trash2, ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";

export function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const hasIneligibleItems = items.some((item) => !item.codEligible);
  const hasEligibleItems = items.some((item) => item.codEligible);

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Your cart is empty
          </h1>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Browse the shop and add something you like.
          </p>
          <Link
            to="/#shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            Go to Shop
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>Your Cart</h1>

        <div className="space-y-4 mb-8">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl"
              style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
            >
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{item.name}</h3>
                <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>₦{item.price} each</p>
                {!item.codEligible && (
                  <span
                    className="inline-block text-xs px-2 py-1 rounded font-medium"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                  >
                    Card payment only
                  </span>
                )}
              </div>

              <div className="flex items-center rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="p-2 transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="p-2 transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="font-bold w-20 text-right" style={{ color: 'var(--color-text-primary)' }}>
                ₦{(item.price * item.quantity).toFixed(2)}
              </div>

              <button
                onClick={() => removeItem(item.productId)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-error)' }}
                aria-label="Remove item"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Subtotal: ₦{subtotal.toFixed(2)}
          </div>

          {hasIneligibleItems && hasEligibleItems && (
            <p className="text-sm text-right max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
              Your cart mixes items that support Cash on Delivery with items that need card payment. You'll be able to pay by card for everything, or split into two orders, at checkout.
            </p>
          )}
          {hasIneligibleItems && !hasEligibleItems && (
            <p className="text-sm text-right max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
              Every item in your cart requires card payment.
            </p>
          )}

          <Link
            to="/checkout"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            Proceed to Checkout
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
