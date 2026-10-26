import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isPhysical } from "../utils/productTypes";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  codEligible: boolean;
  quantity: number;
  // Missing on carts saved before product types existed - treated as physical.
  productType?: string;
  // Tickets: one cart line per ticket type.
  tierId?: string;
  tierName?: string;
}

export const MAX_TICKETS_PER_LINE = 10;

// A cart line is a product - or, for tickets, a product + ticket type.
export const lineKey = (item: { productId: string; tierId?: string }) =>
  item.tierId ? `${item.productId}:${item.tierId}` : item.productId;

// Physical goods: any quantity. Tickets: several per type. Everything else
// (downloads, courses) is one per order - you can't own the same ebook twice.
function clampQuantity(productType: string | undefined, quantity: number): number {
  if (isPhysical(productType)) return quantity;
  if (productType === "ticket") return Math.min(quantity, MAX_TICKETS_PER_LINE);
  return 1;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (
    product: { id: string; name: string; image: string; price: number; codEligible: boolean; productType?: string; tierId?: string; tierName?: string },
    quantity?: number
  ) => void;
  // Both take lineKey(item).
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const STORAGE_KEY = "naychurrahl_cart";

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextValue["addItem"] = (product, quantity = 1) => {
    const key = lineKey({ productId: product.id, tierId: product.tierId });
    setItems((prev) => {
      const existing = prev.find((item) => lineKey(item) === key);
      if (existing) {
        return prev.map((item) =>
          lineKey(item) === key ? { ...item, quantity: clampQuantity(item.productType, item.quantity + quantity) } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          codEligible: product.codEligible,
          productType: product.productType ?? "physical",
          ...(product.tierId ? { tierId: product.tierId, tierName: product.tierName } : {}),
          quantity: clampQuantity(product.productType, quantity),
        },
      ];
    });
  };

  const updateQuantity = (key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((item) => lineKey(item) !== key)
        : prev.map((item) =>
            lineKey(item) === key ? { ...item, quantity: clampQuantity(item.productType, quantity) } : item
          )
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => lineKey(item) !== key));
  };

  const clearCart = () => setItems([]);

  // Distinct product lines, not total quantity - a badge showing "12" because
  // someone ordered 12 of one thing reads as clutter, not cart contents.
  const itemCount = useMemo(() => items.length, [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
