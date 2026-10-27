export interface OrderDiscount {
  source: "coupon" | "referral";
  code: string | null;
  fundedBy: "platform" | "merchant";
  amount: number;
}

// "Coupon WELCOME10  −₦500" / "Invite discount  −₦450" rows between an
// order's items and its total.
export function OrderDiscountLines({ discounts }: { discounts?: OrderDiscount[] }) {
  if (!discounts?.length) return null;
  return (
    <>
      {discounts.map((d, i) => (
        <div key={i} className="flex justify-between text-sm" style={{ color: 'var(--color-success)' }}>
          <span>{d.source === "referral" ? "Invite discount" : `Coupon ${d.code}`}</span>
          <span>−₦{d.amount.toLocaleString()}</span>
        </div>
      ))}
    </>
  );
}
