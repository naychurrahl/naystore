// The payment fee the buyer paid with an order: a cash-on-delivery order's
// own (Naychurrahl's), or - for card orders - the checkout's one card
// payment's (Paystack's and Naychurrahl's), which may cover several orders.
// With the seller's delivery fee first, when it charged one.
export function OrderFeeLines({ order }: { order: any }) {
  const delivery = order.deliveryFee > 0 ? (
    <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
      <span>{order.deliveryName ?? "Delivery"}</span>
      <span>₦{Number(order.deliveryFee).toFixed(2)}</span>
    </div>
  ) : null;
  if (order.serviceFee > 0) {
    return (
      <>
        {delivery}
        <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>Payment fee (paid on delivery)</span>
          <span>₦{Number(order.serviceFee).toFixed(2)}</span>
        </div>
      </>
    );
  }
  if (order.onlineServiceFee > 0) {
    return (
      <>
        {delivery}
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          The card payment of ₦{Number(order.onlineCharged).toLocaleString()} included a ₦{Number(order.onlineServiceFee).toLocaleString()} payment fee.
        </p>
      </>
    );
  }
  return delivery;
}

// On every order page and receipt: what the store stands behind.
export function PaidHereNotice() {
  return (
    <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
      Buyer protection, refunds and reviews apply only to orders paid for here, on the store. Never pay a seller outside it.
    </p>
  );
}

// What the buyer paid for these orders (one checkout): items, each COD
// order's fee, and the card payment's fee once.
export function checkoutPaid(orders: any[]): number {
  const card = orders.find((o) => o.onlineServiceFee > 0);
  return orders.reduce((sum, o) => sum + Number(o.total) + Number(o.serviceFee ?? 0), 0) + Number(card?.onlineServiceFee ?? 0);
}
