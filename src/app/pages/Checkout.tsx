import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";
import { CheckCircle2, XCircle, ArrowLeft, CreditCard, Truck, Layers, Ticket, Wallet, Smartphone, TicketPercent, X, Gift } from "lucide-react";
import { toast } from "sonner";
import PaystackPop from "@paystack/inline-js";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useCart, lineKey } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { FulfillmentStatus } from "../components/FulfillmentStatus";
import { NIGERIA_STATE_LGAS, NIGERIA_STATES } from "../data/nigeriaStates";
import { isPhysical, requiresAccount } from "../utils/productTypes";
import { paymentLine } from "../utils/paymentLabel";
import { OrderDiscountLines } from "../components/OrderDiscountLines";

type PaymentChoice = "cod" | "card" | "split";
type Provider = "paystack" | "naylet";
type Attendee = { name: string; email: string };
// What coupons/check says a code takes off, per cart line (index into items).
type AppliedCoupon = { code: string; label: string; amount: number; lines: { index: number; amount: number }[] };
// A referred friend's first-order discount, on top of any coupon.
type InviteDiscount = { label: string; amount: number; lines: { index: number; amount: number }[] };

// The checkout form survives the round trip to Naylet to connect a wallet.
const DRAFT_KEY = "naychurrahl_checkout_draft";
const NAYLET_APPROVAL_MS = 15 * 60 * 1000;

const paystack = new PaystackPop();

export function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user, authHeader } = useAuth();
  const [form, setForm] = useState({
    customerName: "", email: "", phone: "",
    state: "", lga: "", area: "", landmark: "", address: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name || "",
        email: prev.email || user.email,
        phone: prev.phone || user.phone || "",
        state: prev.state || user.state || "",
        lga: prev.lga || user.lga || "",
        area: prev.area || user.area || "",
        landmark: prev.landmark || user.landmark || "",
        address: prev.address || user.address || "",
      }));
    }
  }, [user]);

  // Only carts with something to ship need a delivery address - downloads,
  // courses and tickets are delivered to the buyer's email and Library.
  const needsAddress = items.some((item) => isPhysical(item.productType));

  // Downloads/courses need an account (e.g. added to the cart before logging out).
  const { openLogin } = useAuthModal();
  const location = useLocation();
  const accountOnlyItems = items.filter((item) => requiresAccount(item.productType));
  const needsLogin = !user && accountOnlyItems.length > 0;

  // Tickets: a name (and optional email) for every ticket, per cart line.
  const ticketLines = items.filter((item) => item.tierId);
  const [attendees, setAttendees] = useState<Record<string, Attendee[]>>({});
  const attendeesFor = (key: string, count: number): Attendee[] =>
    Array.from({ length: count }, (_, i) => attendees[key]?.[i] ?? { name: "", email: "" });
  const setAttendee = (key: string, count: number, index: number, patch: Partial<Attendee>) =>
    setAttendees((prev) => ({
      ...prev,
      [key]: attendeesFor(key, count).map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));

  // Online payments: Paystack, or the buyer's Naylet wallet (logged-in
  // buyers; the connection is saved to their account).
  const [provider, setProvider] = useState<Provider>("paystack");
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: walletData } = useAPI(user ? `${API_BASE}/wallet-status?balance=1` : null, { headers: authHeader });
  const wallet = walletData as { connected: boolean; balanceNgn: number | null; balanceError: string | null } | null;
  const [awaiting, setAwaiting] = useState<{ orderId: string; amount: number; deadline: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const checkNow = useRef<() => void>(() => {});

  useEffect(() => {
    if (!awaiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [awaiting]);

  // Back from connecting Naylet: restore what was typed, pick Naylet.
  useEffect(() => {
    const result = searchParams.get("wallet");
    if (!result) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
      if (draft) {
        setForm((prev) => ({ ...prev, ...draft.form }));
        setAttendees(draft.attendees ?? {});
        if (draft.couponCode) setCouponInput(draft.couponCode);
      }
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // A lost draft only means retyping the form.
    }
    if (result === "connected") {
      setProvider("naylet");
      toast.success("Naylet wallet connected");
    } else {
      toast.error(searchParams.get("reason") === "declined" ? "Naylet connection declined" : "Could not connect your Naylet wallet");
    }
    setSearchParams((params) => {
      params.delete("wallet");
      params.delete("reason");
      return params;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const codItems = items.filter((item) => item.codEligible);
  const cardOnlyItems = items.filter((item) => !item.codEligible);
  const isMixed = codItems.length > 0 && cardOnlyItems.length > 0;
  const isCardOnly = codItems.length === 0 && cardOnlyItems.length > 0;

  const paymentOptions: { value: PaymentChoice; label: string; description: string; icon: typeof CreditCard }[] = isCardOnly
    ? [{ value: "card", label: "Pay online now", description: "Paystack or your Naylet wallet", icon: CreditCard }]
    : isMixed
    ? [
        {
          value: "split",
          label: "Split my order",
          description: `Cash on Delivery for ${codItems.length} item(s), pay online for ${cardOnlyItems.length} item(s)`,
          icon: Layers,
        },
        {
          value: "card",
          label: "Pay the whole order online",
          description: "One payment for everything in your cart",
          icon: CreditCard,
        },
      ]
    : [
        { value: "cod", label: "Cash on Delivery", description: "Pay when your order arrives", icon: Truck },
        { value: "card", label: "Pay online now", description: "Paystack or your Naylet wallet", icon: CreditCard },
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

  // Coupon: previewed by coupons/check; the order works it out again itself.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [invite, setInvite] = useState<InviteDiscount | null>(null);
  const discountAt = (index: number) =>
    (coupon?.lines.find((l) => l.index === index)?.amount ?? 0) + (invite?.lines.find((l) => l.index === index)?.amount ?? 0);
  const discountOn = (subset: typeof items) =>
    items.reduce((sum, item, index) => sum + (subset.includes(item) ? discountAt(index) : 0), 0);
  const discount = (coupon?.amount ?? 0) + (invite?.amount ?? 0);

  const checkLines = () =>
    items.map((item) => ({ productId: item.productId, quantity: item.quantity, ...(item.tierId ? { tierId: item.tierId } : {}) }));

  // The invite discount follows the cart, the login and the coupon (it comes
  // off what the coupon leaves).
  const refreshInvite = async (code?: string) => {
    if (!user) {
      setInvite(null);
      return;
    }
    try {
      const result = await api.post(`${API_BASE}/coupons/check`, { code: code ?? "", email: form.email, items: checkLines() }, { headers: authHeader });
      setInvite(result.invite ?? null);
    } catch {
      setInvite(null);
    }
  };
  const cartKey = items.map((item) => `${item.productId}:${item.tierId ?? ""}:${item.quantity}`).join("|");
  useEffect(() => {
    void refreshInvite(coupon?.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, cartKey]);

  const removeCoupon = () => {
    setCoupon(null);
    void refreshInvite();
  };

  const applyCoupon = async (code: string) => {
    if (!code.trim()) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const result = await api.post(`${API_BASE}/coupons/check`, {
        code,
        email: form.email,
        items: checkLines(),
      }, { headers: authHeader });
      setCoupon(result);
      setInvite(result.invite ?? null);
      setCouponInput("");
    } catch (err: any) {
      setCoupon(null);
      setCouponError(err.message || "That code can't be used");
    } finally {
      setCheckingCoupon(false);
    }
  };

  // What the online part costs (the whole order, or the card-only half of a split).
  const onlineTotal = paymentMethod === "card"
    ? subtotal - discount
    : cardOnlyItems.reduce((sum, i) => sum + i.price * i.quantity, 0) - discountOn(cardOnlyItems);
  const nothingToPayOnline = paymentMethod !== "cod" && onlineTotal <= 0;
  const nayletUsable = !!user && !!wallet?.connected && Math.abs(onlineTotal - Math.round(onlineTotal)) < 0.001;
  const usingNaylet = paymentMethod !== "cod" && provider === "naylet" && !nothingToPayOnline;

  if (items.length === 0 && !placedOrders && !awaiting) {
    return <Navigate to="/cart" replace />;
  }

  if (awaiting) {
    const left = Math.max(0, awaiting.deadline - now);
    const mm = Math.floor(left / 60000);
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="max-w-md w-full p-8 rounded-xl text-center space-y-4" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
          <Smartphone className="h-12 w-12 mx-auto" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Approve in your Naylet app</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Open Naylet on your phone and approve the payment of{" "}
            <strong style={{ color: 'var(--color-text-primary)' }}>₦{awaiting.amount.toLocaleString()}</strong> to Naychurrahl.
          </p>
          <p className="text-3xl font-mono" style={{ color: 'var(--color-text-primary)' }} aria-live="polite">{mm}:{ss}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            This page updates by itself once you approve or decline. Checkout {awaiting.orderId}.
          </p>
          <button
            type="button"
            onClick={() => checkNow.current()}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            I've approved - check now
          </button>
        </div>
      </div>
    );
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

          {placedOrders.length > 1 && (
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Your checkout became {placedOrders.length} orders - one for each seller and way of paying - so each is delivered (and can be refunded) on its own.
            </p>
          )}

          {placedOrders.map((order) => (
            <div key={order.id} className="text-left mb-6">
              {order.sellerName && (
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Sold by {order.sellerName}</p>
              )}
              <p className="mb-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Order <strong style={{ color: 'var(--color-text-primary)' }}>{order.id}</strong> —{" "}
                {paymentLine(order)}
              </p>
              <div className="space-y-1 mb-2">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{item.quantity} × {item.name}</span>
                    <span>₦{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <OrderDiscountLines discounts={order.discounts} />
              </div>
              <div className="flex justify-between font-bold pt-2" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
                <span>Total</span>
                <span>₦{order.total}</span>
              </div>
              {(order.fulfillments ?? []).map((f: any) => (
                <FulfillmentStatus key={f.id} fulfillment={f} />
              ))}
            </div>
          ))}

          {!paymentFailed && placedOrders.some((o) => o.items.some((i: any) => !isPhysical(i.productType))) && (
            <Link
              to="/library"
              className="inline-flex items-center gap-2 px-6 py-3 mb-3 mr-2 rounded-lg font-medium transition-colors"
              style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
            >
              Open my Library
            </Link>
          )}
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

  // The checkout's one online payment covers all its online orders, so it's
  // verified once and every order takes its new status from the answer.
  const finalizeOrders = async (orders: any[], checkoutId: string) => {
    if (orders.some((o) => o.paymentMethod === "card")) {
      const verified = await api.get(`${API_BASE}/payment/${checkoutId}`, { headers: authHeader }).catch(() => null);
      const latest = new Map<string, any>((verified?.orders ?? []).map((o: any) => [o.id, o]));
      orders = orders.map((o) => {
        const now = latest.get(o.id);
        return now ? { ...o, paymentStatus: now.paymentStatus, status: now.status } : o;
      });
      setPaymentFailed(verified?.paymentStatus !== "success");
    }

    clearCart();
    setPlacedOrders(orders);
  };

  // Polls the checkout every few seconds (or at once on "check now") until
  // the Naylet charge is approved, declined or times out.
  const waitForNaylet = async (checkoutId: string, until: number) => {
    while (Date.now() < until) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 3000);
        checkNow.current = () => { clearTimeout(timer); resolve(); };
      });
      const status = await api.get(`${API_BASE}/payment/${checkoutId}`, { headers: authHeader }).catch(() => null);
      if (status && status.paymentStatus !== "pending") return;
    }
  };

  const connectNaylet = async () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, attendees, couponCode: coupon?.code }));
    } catch {
      // Storage blocked: the form just won't be refilled.
    }
    try {
      const { url } = await api.get(`${API_BASE}/wallet-connect?return=checkout`, { headers: authHeader });
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Could not start the Naylet connection");
    }
  };

  const placeOrder = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.post(`${API_BASE}/orders`, {
        ...form,
        paymentMethod,
        paymentProvider: paymentMethod === "cod" || nothingToPayOnline ? undefined : provider,
        couponCode: coupon?.code,
        guestId: user ? undefined : getGuestId(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          ...(item.tierId ? {
            tierId: item.tierId,
            attendees: attendeesFor(lineKey(item), item.quantity).map((a) => ({ name: a.name.trim(), email: a.email.trim() })),
          } : {}),
        })),
      }, { headers: authHeader });

      // One order per seller and payment method; the online ones share one payment.
      const orders: any[] = result.orders;
      const checkoutId: string = result.checkoutId;
      const payment = result.payment;

      if (payment?.provider === "naylet") {
        setAwaiting({ orderId: checkoutId, amount: payment.amountNgn, deadline: Date.now() + NAYLET_APPROVAL_MS });
        await waitForNaylet(checkoutId, Date.now() + NAYLET_APPROVAL_MS + 30000);
        await finalizeOrders(orders, checkoutId);
        setAwaiting(null);
        setSubmitting(false);
        return;
      }

      if (!payment?.access_code) {
        await finalizeOrders(orders, checkoutId);
        setSubmitting(false);
        return;
      }

      paystack.resumeTransaction(payment.access_code, {
        onSuccess: () => finalizeOrders(orders, checkoutId).finally(() => setSubmitting(false)),
        onCancel: () => finalizeOrders(orders, checkoutId).finally(() => setSubmitting(false)),
        onError: () => finalizeOrders(orders, checkoutId).finally(() => setSubmitting(false)),
      });
    } catch (err: any) {
      // 422 is the coupon no longer applying (used up, expired...) - drop it
      // so the buyer sees the new total before trying again.
      if (err.status === 422 && coupon) {
        removeCoupon();
        setCouponError(err.message);
        setError("Your coupon couldn't be used, so it was removed. Check the new total and try again.");
      } else {
        setError(err.message || "Could not place order. Please try again.");
      }
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (user && saveDetails && needsAddress) {
      setShowSaveConfirm(true);
      return;
    }

    void placeOrder();
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirm(false);
    try {
      await api.put(`${API_BASE}/profile`, {
        phone: form.phone, state: form.state, lga: form.lga, area: form.area, landmark: form.landmark, address: form.address,
      }, { headers: authHeader });
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
            {(["customerName", "email", "phone"] as const).map((field) => (
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

            {ticketLines.length > 0 && (
              <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Ticket className="h-4 w-4" /> Who's attending?
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Each ticket carries its holder's name. Add an email to send that person their own ticket; otherwise all tickets come to you.
                  </p>
                </div>
                {ticketLines.map((item) => {
                  const key = lineKey(item);
                  return (
                    <div key={key} className="space-y-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.name} &middot; {item.tierName}
                      </p>
                      {attendeesFor(key, item.quantity).map((attendee, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <input
                            type="text"
                            required
                            aria-label={`Ticket ${i + 1} name`}
                            placeholder={`Ticket ${i + 1}: full name`}
                            value={attendee.name}
                            onChange={(e) => setAttendee(key, item.quantity, i, { name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                          />
                          <input
                            type="email"
                            aria-label={`Ticket ${i + 1} email`}
                            placeholder="Email (optional)"
                            value={attendee.email}
                            onChange={(e) => setAttendee(key, item.quantity, i, { email: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                          />
                          <button
                            type="button"
                            onClick={() => setAttendee(key, item.quantity, i, { name: form.customerName, email: form.email })}
                            className="text-xs font-medium justify-self-start"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            That's me
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {!needsAddress && (
              <p className="p-4 rounded-lg border text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Nothing to ship &mdash; your purchase is delivered to your email and your Library right after payment.
              </p>
            )}

            {needsAddress && (
            <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Delivery Address</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    State
                  </label>
                  <select
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value, lga: "" })}
                    className="w-full px-4 py-3 rounded-lg border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="" disabled>Select state</option>
                    {NIGERIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    LGA
                  </label>
                  <select
                    required
                    disabled={!form.state}
                    value={form.lga}
                    onChange={(e) => setForm({ ...form, lga: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border disabled:opacity-50"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="" disabled>{form.state ? "Select LGA" : "Select state first"}</option>
                    {(NIGERIA_STATE_LGAS[form.state] ?? []).map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Area
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ikeja GRA"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Landmark (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Shoprite"
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Address Line
                </label>
                <input
                  type="text"
                  required
                  placeholder="House number and street"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>

              {(form.address || form.landmark || form.area || form.lga || form.state) && (
                <p className="text-xs pt-1" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
                  {[form.address, form.landmark, form.area, form.lga, form.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            )}

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

              {nothingToPayOnline && (
                <p className="mt-3 text-sm" style={{ color: 'var(--color-success)' }}>
                  Your {coupon ? "coupon covers" : "discount covers"} {paymentMethod === "card" ? "the whole order" : "the online part"} - there's nothing to pay online.
                </p>
              )}
              {paymentMethod !== "cod" && !nothingToPayOnline && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Pay online with</p>
                  {([
                    { value: "paystack", label: "Paystack", description: "Card, bank transfer or USSD", icon: CreditCard },
                    { value: "naylet", label: "Naylet wallet", description: "Pay from your RT balance, approved in the Naylet app", icon: Wallet },
                  ] as const).map(({ value, label, description, icon: Icon }) => {
                    const selected = provider === value;
                    const disabled = value === "naylet" && !user;
                    return (
                      <label
                        key={value}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${disabled ? "opacity-60" : "cursor-pointer"}`}
                        style={{
                          borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: selected ? 'var(--color-primary-light)' : 'transparent',
                        }}
                      >
                        <input
                          type="radio"
                          name="paymentProvider"
                          checked={selected}
                          disabled={disabled}
                          onChange={() => setProvider(value)}
                          className="mt-1"
                        />
                        <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
                          {value === "naylet" && !user && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                              <button type="button" onClick={() => openLogin(location.pathname)} className="underline">Log in</button> to pay with Naylet.
                            </p>
                          )}
                          {value === "naylet" && user && selected && (
                            wallet?.connected ? (
                              <div className="text-xs mt-1 space-y-0.5">
                                {wallet.balanceNgn !== null && (
                                  <p style={{ color: wallet.balanceNgn < onlineTotal ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                                    Balance: ₦{wallet.balanceNgn.toLocaleString()}
                                    {wallet.balanceNgn < onlineTotal && ` - not enough for ₦${onlineTotal.toLocaleString()}. Top up in Naylet first.`}
                                  </p>
                                )}
                                {wallet.balanceError && <p style={{ color: 'var(--color-text-muted)' }}>{wallet.balanceError}</p>}
                                {Math.abs(onlineTotal - Math.round(onlineTotal)) >= 0.001 && (
                                  <p style={{ color: 'var(--color-error)' }}>Naylet takes whole-naira amounts; pay this order with Paystack.</p>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void connectNaylet()}
                                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                              >
                                Connect your Naylet wallet
                              </button>
                            )
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
            )}

            {needsLogin && (
              <div className="p-4 rounded-lg text-sm space-y-2" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-text-secondary)' }}>
                <p>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Log in to continue.</strong>{" "}
                  Courses and digital downloads are kept in your account, so you need one to buy{" "}
                  {accountOnlyItems.map((item) => item.name).join(", ")}. Physical items and event tickets can be bought as a guest.
                </p>
                <button
                  type="button"
                  onClick={() => openLogin(location.pathname)}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                >
                  Log in or create an account
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || needsLogin || (usingNaylet && !nayletUsable)}
              className="w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {submitting ? "Processing..." : paymentMethod === "cod" || nothingToPayOnline ? "Place Order" : usingNaylet ? "Pay with Naylet" : "Continue to Payment"}
            </button>
          </form>

          <div className="p-6 rounded-xl h-fit" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map((item, index) => (
                <div key={lineKey(item)} className="flex justify-between gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{item.quantity} × {item.name}{item.tierName ? ` (${item.tierName})` : ""}</span>
                  <span className="text-right shrink-0">
                    ₦{(item.price * item.quantity).toFixed(2)}
                    {discountAt(index) > 0 && (
                      <span className="block text-xs" style={{ color: 'var(--color-success)' }}>−₦{discountAt(index).toLocaleString()}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 mb-4 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              {coupon ? (
                <div className="flex items-center justify-between gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <TicketPercent className="h-4 w-4 shrink-0" />
                    <span className="truncate"><strong>{coupon.code}</strong> · {coupon.label}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    −₦{coupon.amount.toLocaleString()}
                    <button type="button" onClick={removeCoupon} aria-label="Remove coupon" title="Remove coupon">
                      <X className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); void applyCoupon(couponInput); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    className="min-w-0 flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <button
                    type="submit"
                    disabled={checkingCoupon || !couponInput.trim()}
                    className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    {checkingCoupon ? "Checking…" : "Apply"}
                  </button>
                </form>
              )}
              {couponError && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{couponError}</p>}
              {invite && (
                <div className="flex items-center justify-between gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Gift className="h-4 w-4 shrink-0" />
                    <span className="truncate">{invite.label} · your first order</span>
                  </span>
                  <span className="shrink-0">−₦{invite.amount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Subtotal</span>
                <span>₦{subtotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
              <span>Total</span>
              <span>₦{(subtotal - discount).toFixed(2)}</span>
            </div>
            {paymentMethod === "split" && discount > 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Online now: ₦{onlineTotal.toFixed(2)} · on delivery: ₦{(subtotal - discount - onlineTotal).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
