import { useState, useEffect, useRef, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { CreditCard, Truck, Layers } from "lucide-react";
import { toast } from "sonner";
import PaystackPop from "@paystack/inline-js";
import { landingPromo, trackInsight } from "../utils/insights";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useCart, lineKey } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { isPhysical } from "../utils/productTypes";

// Everything checkout does - the form, coupons, the quote, placing the order
// and paying for it - shared by the Classic and Marketplace checkout pages, so
// both take orders exactly the same way and only their markup differs.

export type PaymentChoice = "cod" | "card" | "split";
type Provider = "paystack" | "naylet";
type Attendee = { name: string; email: string };
// What the API says the cart costs (POST checkout-quote): the items, and the
// payment fee on top - Naychurrahl's on every payment (each cash-on-delivery
// order too), and Paystack's on the card payment.
export type Quote = {
  online: { items: number; serviceFee: number; total: number } | null;
  onDelivery: { items: number; serviceFee: number; total: number } | null;
  subtotal: number;
  discount: number;
  itemsTotal: number;
  platformFee: number;
  gatewayFee: number;
  serviceFee: number;
  total: number;
};

// What coupons/check says a code takes off, per cart line (index into items).
export type AppliedCoupon = { code: string; label: string; amount: number; lines: { index: number; amount: number }[] };
// A referred friend's first-order discount, on top of any coupon.
export type InviteDiscount = { label: string; amount: number; lines: { index: number; amount: number }[] };

// The checkout form survives the round trip to Naylet to connect a wallet.
const DRAFT_KEY = "naychurrahl_checkout_draft";
const NAYLET_APPROVAL_MS = 15 * 60 * 1000;
// One @, no spaces, a dot in the domain - the backend checks it properly.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;


const paystack = new PaystackPop();

export function useCheckout() {
  const { items, subtotal, clearCart } = useCart();
  // Once per checkout opened, for what's in the cart then.
  useEffect(() => trackInsight("checkout", items.map((item) => item.productId)), []); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Downloads, courses and tickets are sent to the email, so a guest is asked
  // to check it before paying - a typo means the purchase never arrives.
  const deliversByEmail = items.some((item) => !isPhysical(item.productType));
  // Only a delivery needs a phone (the rider calls); a filled-in one must be real.
  const [phoneValid, setPhoneValid] = useState(true);

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
  const [confirmEmail, setConfirmEmail] = useState(false);

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

  // The service fee comes from the API's quote, priced as the order will be.
  const [quote, setQuote] = useState<Quote | null>(null);
  useEffect(() => {
    let live = true;
    if (items.length === 0) return;
    api.post(`${API_BASE}/checkout-quote`, {
      items: checkLines(), paymentMethod, paymentProvider: provider, couponCode: coupon?.code, email: form.email,
    }, { headers: authHeader })
      .then((q: Quote) => { if (live) setQuote(q); })
      .catch(() => { if (live) setQuote(null); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, paymentMethod, provider, coupon?.code, invite?.amount, user?.id]);

  // What the online part costs (the whole order, or the card-only half of a split).
  const onlineTotal = paymentMethod === "card"
    ? subtotal - discount
    : cardOnlyItems.reduce((sum, i) => sum + i.price * i.quantity, 0) - discountOn(cardOnlyItems);
  // ...and with the service fee, what's actually charged.
  const onlineCharge = quote?.online?.total ?? onlineTotal;
  const nothingToPayOnline = paymentMethod !== "cod" && onlineTotal <= 0;
  const nayletUsable = !!user && !!wallet?.connected && Math.abs(onlineTotal - Math.round(onlineTotal)) < 0.001;
  const usingNaylet = paymentMethod !== "cod" && provider === "naylet" && !nothingToPayOnline;

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
        promo: landingPromo() || undefined,
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
    setError(null);

    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setError("Enter a valid email address - your receipt and any downloads go there.");
      return;
    }
    if (!phoneValid) {
      setError("Check your phone number - include the country code if it isn't Nigerian.");
      return;
    }
    if (needsAddress && !form.phone.trim()) {
      setError("Add a phone number so the rider can reach you.");
      return;
    }
    if (!user && deliversByEmail) {
      setConfirmEmail(true);
      return;
    }

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

  return {
    items,
    subtotal,
    user,
    form,
    setForm,
    needsAddress,
    deliversByEmail,
    phoneValid,
    setPhoneValid,
    ticketLines,
    attendeesFor,
    setAttendee,
    provider,
    setProvider,
    wallet,
    awaiting,
    now,
    checkNow,
    codItems,
    cardOnlyItems,
    isMixed,
    isCardOnly,
    paymentOptions,
    paymentMethod,
    setPaymentMethod,
    saveDetails,
    setSaveDetails,
    showSaveConfirm,
    confirmEmail,
    setConfirmEmail,
    submitting,
    error,
    placedOrders,
    paymentFailed,
    couponInput,
    setCouponInput,
    coupon,
    couponError,
    setCouponError,
    checkingCoupon,
    invite,
    discountAt,
    discount,
    applyCoupon,
    removeCoupon,
    quote,
    onlineTotal,
    onlineCharge,
    nothingToPayOnline,
    nayletUsable,
    usingNaylet,
    connectNaylet,
    placeOrder,
    handleSubmit,
    handleConfirmSave,
    handleSkipSave,
  };
}
