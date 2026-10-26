import { CouponManager } from "../components/CouponManager";

export function MerchantCouponsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Coupons</h1>
      <CouponManager productsEndpoint="/my-products" />
    </div>
  );
}
