import { useMemo, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { CheckCircle2, CreditCard, Gift, Lock, ShieldCheck, Smartphone, Ticket, TicketPercent, Wallet, X, XCircle } from "lucide-react";
import { lineKey } from "../context/CartContext";
import { useAuthModal } from "../context/AuthModalContext";
import { FulfillmentStatus } from "../components/FulfillmentStatus";
import { OrderDiscountLines } from "../components/OrderDiscountLines";
import { PhoneInput } from "../components/PhoneInput";
import { NIGERIA_STATE_LGAS, NIGERIA_STATES } from "../data/nigeriaStates";
import { isPhysical } from "../utils/productTypes";
import { paymentLine } from "../utils/paymentLabel";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useCheckout } from "../checkout/useCheckout";
import { m2, Monogram, naira, useCatalog } from "./ui";

function Step({ n, title, note, children }: { n: number; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="m2-panel p-4 sm:p-5 grid gap-4" aria-labelledby={`m2-step-${n}`}>
      <div className="flex items-start gap-3">
        <span className="h-7 w-7 rounded-full inline-flex items-center justify-center text-sm font-extrabold shrink-0" style={{ background: "var(--m-ink)", color: "var(--m-surface)" }}>{n}</span>
        <div><h2 id={`m2-step-${n}`} className="font-extrabold text-lg leading-7">{title}</h2>{note && <p className="text-sm m2-ink3">{note}</p>}</div>
      </div>
      {children}
    </section>
  );
}

function Dialog({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "var(--m-scrim)" }} role="dialog" aria-modal="true" aria-label={title}>
      <div className="m2-panel m2-pop max-w-sm w-full p-5 grid gap-3">
        <h3 className="font-extrabold text-lg">{title}</h3>
        <div className="text-sm m2-ink2">{children}</div>
        <div className="flex justify-end gap-2 pt-1">{actions}</div>
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const c = useCheckout();
  const { openLogin, openRegister } = useAuthModal();
  const location = useLocation();
  const { products } = useCatalog();
  const { items, form, setForm } = c;

  // Which shop each line belongs to: the checkout becomes one order per shop.
  const groups = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const out = new Map<string, { name: string; lines: { item: typeof items[number]; index: number }[] }>();
    items.forEach((item, index) => {
      const p = byId.get(item.productId);
      const k = p?.merchantSlug ?? "_";
      const g = out.get(k) ?? { name: p?.merchantName ?? "", lines: [] };
      g.lines.push({ item, index });
      out.set(k, g);
    });
    return [...out.values()];
  }, [items, products]);

  if (items.length === 0 && !c.placedOrders && !c.awaiting) return <Navigate to={m2("/cart")} replace />;

  if (c.awaiting) {
    const left = Math.max(0, c.awaiting.deadline - c.now);
    return (
      <div className="m2-wrap py-12 flex justify-center">
        <div className="m2-panel max-w-md w-full p-8 grid gap-3 text-center justify-items-center">
          <Smartphone className="h-12 w-12" style={{ color: "var(--m-accent)" }} />
          <h1 className="text-2xl font-extrabold">Approve in your Naylet app</h1>
          <p className="m2-ink2">Open Naylet on your phone and approve the payment of <b className="m2-num">{naira(c.awaiting.amount)}</b>.</p>
          <p className="text-3xl font-extrabold m2-num" aria-live="polite">{Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}</p>
          <p className="text-xs m2-ink3">This page updates by itself once you approve or decline. Checkout {c.awaiting.orderId}.</p>
          <button type="button" className="m2-btn-line" onClick={() => c.checkNow.current()}>I've approved - check now</button>
        </div>
      </div>
    );
  }

  if (c.placedOrders) {
    const orders = c.placedOrders;
    const digital = orders.some((o) => o.items.some((i: any) => !isPhysical(i.productType)));
    const card = orders.find((o) => o.onlineCharged);
    return (
      <div className="m2-wrap py-8 flex justify-center">
        <div className="max-w-2xl w-full grid gap-4">
          <div className="text-center grid justify-items-center gap-2">
            {c.paymentFailed ? <XCircle className="h-14 w-14" style={{ color: "var(--m-bad)" }} /> : <CheckCircle2 className="h-14 w-14" style={{ color: "var(--m-good)" }} />}
            <h1 className="text-3xl font-extrabold">{c.paymentFailed ? "Payment not completed" : orders.length > 1 ? "Orders placed" : "Order placed"}</h1>
            <p className="m2-ink2 max-w-md">
              {c.paymentFailed ? "Your orders are saved, but the payment didn't go through. You can try again from your orders page."
                : orders.length > 1 ? `Your checkout became ${orders.length} orders, one for each shop and way of paying, so each is delivered and tracked on its own.`
                : "We've sent the details to your email."}
            </p>
          </div>
          {orders.map((o) => (
            <article key={o.id} className="m2-panel p-4 grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold">{o.sellerName && <Monogram name={o.sellerName} size={28} />}{o.sellerName ?? "Order"}</span>
                <span className="text-xs m2-ink3">{o.id}</span>
              </div>
              <p className="text-sm m2-ink2">{paymentLine(o)}</p>
              <div className="grid gap-1 text-sm">
                {o.items.map((it: any, n: number) => <div key={n} className="flex justify-between gap-3 m2-ink2"><span>{it.quantity} × {it.name}</span><span className="m2-num">{naira(it.price * it.quantity)}</span></div>)}
                <OrderDiscountLines discounts={o.discounts} />
                {o.serviceFee > 0 && <div className="flex justify-between m2-ink2"><span>Payment fee (paid on delivery)</span><span className="m2-num">{naira(o.serviceFee)}</span></div>}
              </div>
              <div className="flex justify-between font-extrabold pt-2" style={{ borderTop: "1px solid var(--m-line)" }}><span>Total</span><span className="m2-num">{naira(o.total + (o.serviceFee ?? 0))}</span></div>
              {(o.fulfillments ?? []).map((f: any) => <FulfillmentStatus key={f.id} fulfillment={f} />)}
            </article>
          ))}
          {card && <p className="text-sm m2-ink2">Online payment: {naira(card.onlineCharged)}, including a {naira(card.onlineServiceFee)} payment fee.</p>}
          {!c.paymentFailed && !c.user && digital && (
            <p className="text-sm m2-ink2">We've emailed your purchase to <b>{orders[0]?.email || form.email}</b>.{" "}
              <button type="button" className="m2-link" onClick={() => openRegister("/library", "customer", orders[0]?.email || form.email)}>Set a password</button> to keep it in your account.</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {!c.paymentFailed && digital && <Link to="/library" className="m2-btn-line">Open my library</Link>}
            <Link to="/orders" state={{ placedOrders: orders, paymentFailed: c.paymentFailed }} className="m2-btn">Track my orders</Link>
            <Link to={m2()} className="m2-btn-line">Keep shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  let step = 0;
  const total = c.quote?.total ?? c.items.reduce((s, i) => s + i.price * i.quantity, 0) - c.discount;
  const actionLabel = c.submitting ? "Processing…" : c.paymentMethod === "cod" || c.nothingToPayOnline ? "Place order" : c.usingNaylet ? "Pay with Naylet" : "Continue to payment";
  const blocked = c.submitting || (c.usingNaylet && !c.nayletUsable);

  return (
    <div className="m2-wrap py-5 pb-28 lg:pb-10">
      {c.confirmEmail && (
        <Dialog title="Is this your email?" actions={<>
          <button type="button" className="m2-btn-line m2-btn-sm" onClick={() => c.setConfirmEmail(false)}>Change it</button>
          <button type="button" className="m2-btn m2-btn-sm" onClick={() => { c.setConfirmEmail(false); void c.placeOrder(); }}>Yes, place order</button>
        </>}>
          We'll send your purchase to <b>{form.email.trim()}</b>. If it's wrong, it won't reach you.
        </Dialog>
      )}
      {c.showSaveConfirm && (
        <Dialog title="Save these details?" actions={<>
          <button type="button" className="m2-btn-line m2-btn-sm" onClick={c.handleSkipSave}>Not now</button>
          <button type="button" className="m2-btn m2-btn-sm" onClick={c.handleConfirmSave}>Save and continue</button>
        </>}>
          We'll save your phone and address to your account so checkout is quicker next time. You can change them from your account page.
        </Dialog>
      )}

      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Checkout</h1>
          <p className="text-sm m2-ink2">{groups.length > 1 ? `${groups.length} shops, one payment.` : "One payment."}{!c.user && <> No account needed, or <button type="button" className="m2-link" onClick={() => openLogin(location.pathname)}>log in</button>.</>}</p>
        </div>
        <Link to={m2("/cart")} className="m2-link text-sm">← Back to cart</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <form id="m2-checkout" onSubmit={c.handleSubmit} className="grid gap-4 min-w-0" noValidate={false}>
          <Step n={++step} title="Your details" note={c.user ? undefined : "For your receipt and order updates"}>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="m2-label" htmlFor="m2-name">Full name</label><input id="m2-name" required autoComplete="name" className="m2-input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
              <div><label className="m2-label" htmlFor="m2-email">Email</label><input id="m2-email" type="email" required autoComplete="email" className="m2-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <label className="m2-label" htmlFor="checkout-phone">Phone{c.needsAddress ? "" : " (optional)"}</label>
                <PhoneInput id="checkout-phone" required={c.needsAddress} value={form.phone} onChange={(phone, valid) => { setForm((prev) => ({ ...prev, phone })); c.setPhoneValid(valid); }} />
                {c.needsAddress && <p className="text-xs m2-ink3 mt-1">So the rider can reach you on delivery.</p>}
              </div>
            </div>
          </Step>

          {c.needsAddress ? (
            <Step n={++step} title="Delivery address" note="Where your items should go">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="m2-label" htmlFor="m2-state">State</label>
                  <select id="m2-state" required className="m2-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, lga: "" })}>
                    <option value="" disabled>Select state</option>{NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label className="m2-label" htmlFor="m2-lga">LGA</label>
                  <select id="m2-lga" required disabled={!form.state} className="m2-input disabled:opacity-50" value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })}>
                    <option value="" disabled>{form.state ? "Select LGA" : "Select state first"}</option>{(NIGERIA_STATE_LGAS[form.state] ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
                  </select></div>
                <div><label className="m2-label" htmlFor="m2-area">Area</label><input id="m2-area" required placeholder="e.g. Ikeja GRA" className="m2-input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
                <div><label className="m2-label" htmlFor="m2-landmark">Landmark <span className="m2-ink3 font-normal">(optional)</span></label><input id="m2-landmark" placeholder="e.g. Near Shoprite" className="m2-input" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} /></div>
                <div className="col-span-2"><label className="m2-label" htmlFor="m2-address">Street address</label><input id="m2-address" required autoComplete="street-address" placeholder="House number and street" className="m2-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
              {c.user && (
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={c.saveDetails} onChange={(e) => c.setSaveDetails(e.target.checked)} className="h-4 w-4 accent-[var(--m-accent)]" /> Save this address to my account</label>
              )}
            </Step>
          ) : (
            <p className="m2-panel p-4 text-sm m2-ink2">Nothing to ship: your purchase is delivered to your email and your Library right after payment.</p>
          )}

          {c.ticketLines.length > 0 && (
            <Step n={++step} title="Who's attending?" note="Each ticket carries its holder's name. Add an email to send that person their own ticket.">
              {c.ticketLines.map((item) => {
                const k = lineKey(item);
                return (
                  <div key={k} className="grid gap-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5"><Ticket className="h-4 w-4" /> {item.name} · {item.tierName}</p>
                    {c.attendeesFor(k, item.quantity).map((a, i) => (
                      <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <input required aria-label={`Ticket ${i + 1} name`} placeholder={`Ticket ${i + 1}: full name`} className="m2-input" value={a.name} onChange={(e) => c.setAttendee(k, item.quantity, i, { name: e.target.value })} />
                        <input type="email" aria-label={`Ticket ${i + 1} email`} placeholder="Email (optional)" className="m2-input" value={a.email} onChange={(e) => c.setAttendee(k, item.quantity, i, { email: e.target.value })} />
                        <button type="button" className="m2-link text-sm justify-self-start" onClick={() => c.setAttendee(k, item.quantity, i, { name: form.customerName, email: form.email })}>That's me</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Step>
          )}

          <Step n={++step} title="Payment" note="Choose how to pay">
            <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
              {c.paymentOptions.map(({ value, label, description, icon: Icon }) => (
                <label key={value} className="flex items-start gap-3 p-3 rounded-md cursor-pointer"
                  style={{ border: `1px solid ${c.paymentMethod === value ? "var(--m-accent)" : "var(--m-line-strong)"}`, background: c.paymentMethod === value ? "var(--m-accent-soft)" : "transparent" }}>
                  <input type="radio" name="paymentMethod" value={value} checked={c.paymentMethod === value} onChange={() => c.setPaymentMethod(value)} className="mt-1 accent-[var(--m-accent)]" />
                  <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--m-accent)" }} />
                  <span><span className="block font-bold text-sm">{label}</span><span className="block text-xs m2-ink2">{description}</span></span>
                </label>
              ))}
            </div>
            {c.nothingToPayOnline && <p className="text-sm font-semibold" style={{ color: "var(--m-good)" }}>Your {c.coupon ? "coupon covers" : "discount covers"} {c.paymentMethod === "card" ? "the whole order" : "the online part"}; there's nothing to pay online.</p>}
            {c.paymentMethod !== "cod" && !c.nothingToPayOnline && (
              <div className="grid gap-2">
                <p className="text-sm font-bold">Pay online with</p>
                {([
                  { value: "paystack", label: "Paystack", description: "Card, bank transfer or USSD", icon: CreditCard },
                  { value: "naylet", label: "Naylet wallet", description: "Pay from your balance, approved in the Naylet app", icon: Wallet },
                ] as const).map(({ value, label, description, icon: Icon }) => {
                  const on = c.provider === value;
                  const off = value === "naylet" && !c.user;
                  return (
                    <label key={value} className={`flex items-start gap-3 p-3 rounded-md ${off ? "opacity-60" : "cursor-pointer"}`}
                      style={{ border: `1px solid ${on ? "var(--m-accent)" : "var(--m-line-strong)"}`, background: on ? "var(--m-accent-soft)" : "transparent" }}>
                      <input type="radio" name="paymentProvider" checked={on} disabled={off} onChange={() => c.setProvider(value)} className="mt-1 accent-[var(--m-accent)]" />
                      <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--m-accent)" }} />
                      <span className="min-w-0">
                        <span className="block font-bold text-sm">{label}</span><span className="block text-xs m2-ink2">{description}</span>
                        {value === "naylet" && !c.user && <span className="block text-xs mt-1"><button type="button" className="m2-link" onClick={() => openLogin(location.pathname)}>Log in</button> to pay with Naylet.</span>}
                        {value === "naylet" && c.user && on && (c.wallet?.connected ? (
                          <span className="block text-xs mt-1 grid gap-0.5">
                            {c.wallet.balanceNgn !== null && <span style={{ color: c.wallet.balanceNgn < c.onlineCharge ? "var(--m-bad)" : undefined }}>Balance: {naira(c.wallet.balanceNgn)}{c.wallet.balanceNgn < c.onlineCharge && ` - not enough for ${naira(c.onlineCharge)}. Top up in Naylet first.`}</span>}
                            {c.wallet.balanceError && <span className="m2-ink3">{c.wallet.balanceError}</span>}
                            {Math.abs(c.onlineTotal - Math.round(c.onlineTotal)) >= 0.001 && <span style={{ color: "var(--m-bad)" }}>Naylet takes whole-naira amounts; pay this order with Paystack.</span>}
                          </span>
                        ) : <button type="button" className="m2-btn m2-btn-sm mt-2" onClick={() => void c.connectNaylet()}>Connect your Naylet wallet</button>)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <div><label className="m2-label" htmlFor="m2-notes">Note for the seller <span className="m2-ink3 font-normal">(optional)</span></label>
              <textarea id="m2-notes" rows={2} className="m2-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </Step>
          {c.error && <p role="alert" className="m2-panel p-3 text-sm font-semibold" style={{ color: "var(--m-bad)", borderColor: "var(--m-bad)" }}>{c.error}</p>}
        </form>

        <aside className="grid gap-3 lg:sticky lg:top-[90px]" aria-label="Review your order">
          <div className="m2-panel p-4 grid gap-3">
            <h2 className="font-extrabold text-lg">Review your order</h2>
            {groups.map((g, gi) => (
              <div key={gi} className="grid gap-2">
                {g.name && <p className="text-xs font-bold m2-ink3 flex items-center gap-1.5"><Monogram name={g.name} size={18} /> {g.name}</p>}
                {g.lines.map(({ item, index }) => (
                  <div key={lineKey(item)} className="flex gap-3 text-sm">
                    <ImageWithFallback src={item.image} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                    <span className="flex-1 min-w-0"><span className="block line-clamp-2 leading-snug">{item.name}{item.tierName ? ` (${item.tierName})` : ""}</span><span className="text-xs m2-ink3">Qty {item.quantity}</span></span>
                    <span className="text-right shrink-0 m2-num">{naira(item.price * item.quantity)}
                      {c.discountAt(index) > 0 && <span className="block text-xs" style={{ color: "var(--m-good)" }}>−{naira(c.discountAt(index))}</span>}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="pt-3 grid gap-2" style={{ borderTop: "1px solid var(--m-line)" }}>
              {c.coupon ? (
                <div className="flex items-center justify-between gap-2 text-sm" style={{ color: "var(--m-good)" }}>
                  <span className="flex items-center gap-1.5 min-w-0"><TicketPercent className="h-4 w-4 shrink-0" /><span className="truncate"><b>{c.coupon.code}</b> · {c.coupon.label}</span></span>
                  <span className="flex items-center gap-2 shrink-0 m2-num">−{naira(c.coupon.amount)}<button type="button" onClick={c.removeCoupon} aria-label="Remove coupon"><X className="h-4 w-4 m2-ink3" /></button></span>
                </div>
              ) : (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void c.applyCoupon(c.couponInput); }}>
                  <input aria-label="Coupon code" placeholder="Coupon code" className="m2-input flex-1 min-w-0" style={{ minHeight: 40, fontSize: 14 }} value={c.couponInput} onChange={(e) => { c.setCouponInput(e.target.value.toUpperCase()); c.setCouponError(null); }} />
                  <button type="submit" disabled={c.checkingCoupon || !c.couponInput.trim()} className="m2-btn-line m2-btn-sm">{c.checkingCoupon ? "Checking…" : "Apply"}</button>
                </form>
              )}
              {c.couponError && <p className="text-xs" style={{ color: "var(--m-bad)" }}>{c.couponError}</p>}
              {c.invite && <div className="flex items-center justify-between gap-2 text-sm" style={{ color: "var(--m-good)" }}><span className="flex items-center gap-1.5"><Gift className="h-4 w-4" /> {c.invite.label} · your first order</span><span className="m2-num">−{naira(c.invite.amount)}</span></div>}
            </div>
            <dl className="grid gap-1.5 text-sm pt-3" style={{ borderTop: "1px solid var(--m-line)" }}>
              <div className="flex justify-between"><dt className="m2-ink2">Items</dt><dd className="m2-num">{naira(c.quote?.subtotal ?? c.subtotal)}</dd></div>
              {(c.quote?.discount ?? c.discount) > 0 && <div className="flex justify-between" style={{ color: "var(--m-good)" }}><dt>Discount</dt><dd className="m2-num">−{naira(c.quote?.discount ?? c.discount)}</dd></div>}
              {(c.quote?.serviceFee ?? 0) > 0 && <div className="flex justify-between"><dt className="m2-ink2">Payment fee</dt><dd className="m2-num">{naira(c.quote!.serviceFee)}</dd></div>}
              <div className="flex justify-between pt-2 text-lg font-extrabold" style={{ borderTop: "1px solid var(--m-line)" }}><dt>Total</dt><dd className="m2-price">{naira(total)}</dd></div>
            </dl>
            {c.paymentMethod === "split" && c.quote?.online && c.quote.onDelivery && <p className="text-xs m2-ink3">Pay now: {naira(c.quote.online.total)} · on delivery: {naira(c.quote.onDelivery.total)}</p>}
            {c.paymentMethod === "cod" && <p className="text-xs m2-ink3">All of it is paid on delivery.</p>}
            <button type="submit" form="m2-checkout" disabled={blocked} className="m2-btn w-full hidden lg:inline-flex"><Lock className="h-4 w-4" /> {actionLabel}</button>
            <p className="flex gap-2 text-xs m2-ink3"><ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "var(--m-accent)" }} />{groups.length > 1 ? `This becomes ${groups.length} orders, one per shop, paid together.` : "Every charge is listed above before you pay."}</p>
          </div>
        </aside>
      </div>

      {/* Phones: the total and the action stay in reach */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40" style={{ background: "var(--m-surface)", borderTop: "1px solid var(--m-line)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="m2-wrap py-2.5 flex items-center gap-3">
          <div><p className="text-xs m2-ink3">Total</p><p className="m2-price text-lg leading-tight">{naira(total)}</p></div>
          <button type="submit" form="m2-checkout" disabled={blocked} className="m2-btn flex-1"><Lock className="h-4 w-4" /> {actionLabel}</button>
        </div>
      </div>
    </div>
  );
}
