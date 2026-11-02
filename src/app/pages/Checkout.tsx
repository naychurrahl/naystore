import { Link, Navigate, useLocation } from "react-router";
import { CheckCircle2, XCircle, ArrowLeft, CreditCard, Ticket, Wallet, Smartphone, TicketPercent, X, Gift } from "lucide-react";
import { lineKey } from "../context/CartContext";
import { useAuthModal } from "../context/AuthModalContext";
import { FulfillmentStatus } from "../components/FulfillmentStatus";
import { NIGERIA_STATE_LGAS, NIGERIA_STATES } from "../data/nigeriaStates";
import { isPhysical } from "../utils/productTypes";
import { PhoneInput } from "../components/PhoneInput";
import { paymentLine } from "../utils/paymentLabel";
import { OrderDiscountLines } from "../components/OrderDiscountLines";
import { useCheckout } from "../checkout/useCheckout";

const naira = (n: number) => `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Checkout() {
  const {
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
  } = useCheckout();
  const { openLogin, openRegister } = useAuthModal();
  const location = useLocation();

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
                {order.serviceFee > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Payment fee (paid on delivery)</span>
                    <span>₦{order.serviceFee.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-bold pt-2" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
                <span>Total</span>
                <span>₦{(order.total + (order.serviceFee ?? 0)).toFixed(2)}</span>
              </div>
              {(order.fulfillments ?? []).map((f: any) => (
                <FulfillmentStatus key={f.id} fulfillment={f} />
              ))}
            </div>
          ))}

          {placedOrders.find((o) => o.onlineCharged) && (() => {
            const card = placedOrders.find((o) => o.onlineCharged);
            return (
              <p className="text-sm text-left mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Card payment: {naira(card.onlineCharged)}, including a {naira(card.onlineServiceFee)} payment fee.
              </p>
            );
          })()}

          {!paymentFailed && !user && placedOrders.some((o) => o.items.some((i: any) => !isPhysical(i.productType))) && (
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We've emailed your purchase to <strong style={{ color: 'var(--color-text-primary)' }}>{placedOrders[0]?.email || form.email}</strong>.{" "}
              <button type="button" onClick={() => openRegister("/library", "customer", placedOrders[0]?.email || form.email)} className="underline" style={{ color: 'var(--color-primary)' }}>
                Set a password
              </button>{" "}
              to keep it in your account.
            </p>
          )}
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


  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      {confirmEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="max-w-sm w-full rounded-xl p-6" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Is this your email?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              We'll send your purchase to <strong style={{ color: 'var(--color-text-primary)' }}>{form.email.trim()}</strong>. If it's wrong, it won't reach you.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmEmail(false)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Change email
              </button>
              <button
                onClick={() => { setConfirmEmail(false); void placeOrder(); }}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
              >
                Yes, place order
              </button>
            </div>
          </div>
        </div>
      )}

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
            {(["customerName", "email"] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {field === "customerName" ? "Full Name" : "Email"}
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
              <label htmlFor="checkout-phone" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {needsAddress ? "Phone" : "Phone (optional)"}
              </label>
              <PhoneInput
                id="checkout-phone"
                required={needsAddress}
                value={form.phone}
                onChange={(phone, valid) => {
                  setForm((prev) => ({ ...prev, phone }));
                  setPhoneValid(valid);
                }}
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              {needsAddress && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>So the rider can reach you.</p>
              )}
            </div>

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
                                  <p style={{ color: wallet.balanceNgn < onlineCharge ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                                    Balance: ₦{wallet.balanceNgn.toLocaleString()}
                                    {wallet.balanceNgn < onlineCharge && ` - not enough for ₦${onlineCharge.toLocaleString()}. Top up in Naylet first.`}
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

            <button
              type="submit"
              disabled={submitting || (usingNaylet && !nayletUsable)}
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

            {/* The whole bill, line by line. */}
            <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <div className="flex justify-between">
                <span>Items</span>
                <span>{naira(quote?.subtotal ?? subtotal)}</span>
              </div>
              {(quote?.discount ?? discount) > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--color-success)' }}>
                  <span>Discount</span>
                  <span>−{naira(quote?.discount ?? discount)}</span>
                </div>
              )}
              {(quote?.serviceFee ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span>Payment fee</span>
                  <span>{naira(quote!.serviceFee)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between font-bold pt-2 mt-2" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
              <span>Total</span>
              <span>{naira(quote?.total ?? subtotal - discount)}</span>
            </div>
            {paymentMethod === "split" && quote?.online && quote.onDelivery && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Pay now: {naira(quote.online.total)} · pay on delivery: {naira(quote.onDelivery.total)}
              </p>
            )}
            {paymentMethod === "cod" && (quote?.serviceFee ?? 0) > 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>All of it is paid in cash on delivery.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
