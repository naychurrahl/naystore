// The payment fee the buyer paid with an order: a cash-on-delivery order's
// own (Naychurrahl's), or - for card orders - the checkout's one card
// payment's (Paystack's and Naychurrahl's), which may cover several orders.
export function OrderFeeLines({ order }: { order: any }) {
  if (order.serviceFee > 0) {
    return (
      <div className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <span>Payment fee (paid on delivery)</span>
        <span>₦{Number(order.serviceFee).toFixed(2)}</span>
      </div>
    );
  }
  if (order.onlineServiceFee > 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        The card payment of ₦{Number(order.onlineCharged).toLocaleString()} included a ₦{Number(order.onlineServiceFee).toLocaleString()} payment fee.
      </p>
    );
  }
  return null;
}

// What the buyer paid for these orders (one checkout): items, each COD
// order's fee, and the card payment's fee once.
export function checkoutPaid(orders: any[]): number {
  const card = orders.find((o) => o.onlineServiceFee > 0);
  return orders.reduce((sum, o) => sum + Number(o.total) + Number(o.serviceFee ?? 0), 0) + Number(card?.onlineServiceFee ?? 0);
}
