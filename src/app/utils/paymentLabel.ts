// How an order was (or is being) paid, for order lists and receipts.
export function paymentProviderName(provider?: string | null): string {
  return provider === "naylet" ? "Naylet wallet" : "Paystack";
}

export function paymentLine(order: { paymentMethod: string; paymentProvider?: string | null; paymentStatus?: string | null }): string {
  if (order.paymentMethod === "cod") return "Cash on Delivery";
  const provider = paymentProviderName(order.paymentProvider);
  if (order.paymentStatus === "success") return `Paid with ${provider}`;
  if (order.paymentStatus === "failed") return `${provider} payment failed`;
  return order.paymentProvider === "naylet" ? "Waiting for approval in Naylet" : "Online payment pending";
}
