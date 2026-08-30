import { useState, useEffect, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { CheckCircle2, XCircle, ArrowLeft, CreditCard, Truck, Layers } from "lucide-react";
import PaystackPop from "@paystack/inline-js";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

type PaymentChoice = "cod" | "card" | "split";

const paystack = new PaystackPop();

export function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user, authHeader } = useAuth();
  const [form, setForm] = useState({ customerName: "", email: "", phone: "", address: "", notes: "" });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name || "",
        email: prev.email || user.email,
        phone: prev.phone || user.phone || "",
        address: prev.address || user.address || "",
      }));
    }
  }, [user]);

  const codItems = items.filter((item) => item.codEligible);
  const cardOnlyItems = items.filter((item) => !item.codEligible);
  const isMixed = codItems.length > 0 && cardOnlyItems.length > 0;
  const isCardOnly = codItems.length === 0 && cardOnlyItems.length > 0;

  const paymentOptions: { value: PaymentChoice; label: string; description: string; icon: typeof CreditCard }[] = isCardOnly
    ? [{ value: "card", label: "Pay by Card", description: "Secure online payment via Paystack", icon: CreditCard }]
    : isMixed
    ? [
        {
          value: "split",
          label: "Split my order",
          description: `Cash on Delivery for ${codItems.length} item(s), card for ${cardOnlyItems.length} item(s)`,
          icon: Layers,
        },
        {
          value: "card",
          label: "Pay entire order by card",
          description: "One payment for everything in your cart",
          icon: CreditCard,
        },
      ]
    : [
        { value: "cod", label: "Cash on Delivery", description: "Pay when your order arrives", icon: Truck },
        { value: "card", label: "Pay by Card", description: "Secure online payment via Paystack", icon: CreditCard },
      ];

  const [paymentMethod, setPaymentMethod] = useState<PaymentChoice>(paymentOptions[0].value);

  useEffect(() => {
    if (!paymentOptions.some((option) => option.value === paymentMethod)) {
      setPaymentMethod(paymentOptions[0].value);
    }
    // Only re-run when the cart's payment shape actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCardOnly, isMixed]);

  const [saveDetails, setSaveDetails] = useState(true);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrders, setPlacedOrders] = useState<any[] | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  if (items.length === 0 && !placedOrders) {
    return <Navigate to="/cart" replace />;
  }

  if (placedOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="max-w-lg w-full mx-4 p-8 rounded-xl text-center" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
          {paymentFailed ? (
            <XCircle className="h-14 w-14 mx-auto mb-4" style={{ color: 'var(--color-error)' }} />
          ) : (
            <CheckCircle2 className="h-14 w-14 mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
          )}
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {paymentFailed ? "Payment not completed" : placedOrders.length > 1 ? "Orders placed!" : "Order placed!"}
          </h1>

          {placedOrders.map((order) => (
            <div key={order.id} className="text-left mb-6">
              <p className="mb-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Order <strong style={{ color: 'var(--color-text-primary)' }}>{order.id}</strong> —{" "}
                {order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : order.paymentStatus === "success"
                  ? "Paid by card"
                  : order.paymentStatus === "failed"
                  ? "Card payment failed"
                  : "Card payment pending"}
              </p>
              <div className="space-y-1 mb-2">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{item.quantity} × {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold pt-2" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
                <span>Total</span>
                <span>${order.total}</span>
              </div>
            </div>
          ))}

          <Link
            to="/orders"
            state={{ placedOrders, paymentFailed }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            View Order History
          </Link>
        </div>
      </div>
    );
  }

  const finalizeOrders = async (orders: any[]) => {
    const cardOrder = orders.find((o) => o.paymentMethod === "card");

    if (cardOrder) {
      const verified = await api.get(`${API_BASE}/payment/${cardOrder.id}`, { headers: authHeader }).catch(() => null);
      const succeeded = verified?.paymentStatus === "success";
      orders = orders.map((o) =>
        o.id === cardOrder.id && verified ? { ...o, paymentStatus: verified.paymentStatus, status: verified.status } : o
      );
      setPaymentFailed(!succeeded);
    }

    clearCart();
    setPlacedOrders(orders);
  };

  const placeOrder = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.post(`${API_BASE}/orders`, {
        ...form,
        paymentMethod,
        guestId: user ? undefined : getGuestId(),
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }, { headers: authHeader });

      const orders: any[] = result.split ? result.orders : [result.order];
      const cardOrder = orders.find((o) => o.paymentMethod === "card" && o.payment?.access_code);

      if (!cardOrder) {
        await finalizeOrders(orders);
        setSubmitting(false);
        return;
      }

      paystack.resumeTransaction(cardOrder.payment.access_code, {
        onSuccess: () => finalizeOrders(orders).finally(() => setSubmitting(false)),
        onCancel: () => finalizeOrders(orders).finally(() => setSubmitting(false)),
        onError: () => finalizeOrders(orders).finally(() => setSubmitting(false)),
      });
    } catch (err: any) {
      setError(err.message || "Could not place order. Please try again.");
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (user && saveDetails) {
      setShowSaveConfirm(true);
      return;
    }

    void placeOrder();
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirm(false);
    try {
      await api.put(`${API_BASE}/profile`, { phone: form.phone, address: form.address }, { headers: authHeader });
    } catch {
      // Best-effort - a failed profile save shouldn't block placing the order.
    }
    void placeOrder();
  };

  const handleSkipSave = () => {
    setShowSaveConfirm(false);
    void placeOrder();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="max-w-sm w-full rounded-xl p-6" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Save these details?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              We'll save your phone and address to your profile so checkout is faster next time. You can change this anytime from your account page.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleSkipSave}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Not now
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 mb-6 transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Cart
        </Link>

        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="md:col-span-2 space-y-4">
            {(["customerName", "email", "phone", "address"] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {field === "customerName" ? "Full Name" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type={field === "email" ? "email" : "text"}
                  required
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Order Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                rows={3}
              />
            </div>

            {user && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveDetails}
                  onChange={(e) => setSaveDetails(e.target.checked)}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Save these details to my profile
                </span>
              </label>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Payment Method
              </label>
              <div className="space-y-2">
                {paymentOptions.map(({ value, label, description, icon: Icon }) => (
                  <label
                    key={value}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                    style={{
                      borderColor: paymentMethod === value ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: paymentMethod === value ? 'var(--color-primary-light)' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                      className="mt-1"
                    />
                    <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {submitting ? "Processing..." : paymentMethod === "cod" ? "Place Order" : "Continue to Payment"}
            </button>
          </form>

          <div className="p-6 rounded-xl h-fit" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{item.quantity} × {item.name}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold pt-4" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
