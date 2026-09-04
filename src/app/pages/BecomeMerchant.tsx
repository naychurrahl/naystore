import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router";
import { Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { Button } from "../components/ui/button";

export function BecomeMerchant() {
  const { user, becomeMerchant } = useAuth();
  const { openLogin } = useAuthModal();
  const navigate = useNavigate();
  const [commissionType, setCommissionType] = useState<"percentage" | "flat">("percentage");
  const [commissionRate, setCommissionRate] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"fbu" | "fbm">("fbm");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) openLogin("/become-merchant", "merchant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role === "merchant") {
    return <Navigate to="/merchant" replace />;
  }

  const handleUpgrade = async () => {
    const rate = Number(commissionRate);
    if (!commissionRate || Number.isNaN(rate) || rate < 0) {
      setError("Enter a valid, non-negative commission rate");
      return;
    }
    if (!location.trim()) {
      setError("Enter your shop's location");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await becomeMerchant(commissionType, rate, fulfillmentMethod, location.trim());
      navigate("/merchant", { replace: true });
    } catch (err: any) {
      setError(err.message || "Could not upgrade your account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-md w-full mx-4 p-8 rounded-xl text-center" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <Store className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Become a Merchant</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          List and sell your own products, right from your existing account ({user.email}). No new sign-up needed -
          you'll keep the same login and just gain a Dashboard for managing products, orders, and payouts.
        </p>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Commission</label>
            <div className="flex gap-2">
              <select
                value={commissionType}
                onChange={(e) => setCommissionType(e.target.value as "percentage" | "flat")}
                className="px-3 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Flat</option>
              </select>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder={commissionType === "flat" ? "e.g. 5.00" : "e.g. 15"}
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              What we take per sale - admins can revise this later.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Location</label>
            <input
              type="text"
              required
              placeholder="e.g. Ibadan, Oyo"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Shown on your public shop page - you can update it anytime from My Shop.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Logistics</label>
            <select
              value={fulfillmentMethod}
              onChange={(e) => setFulfillmentMethod(e.target.value as "fbu" | "fbm")}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <option value="fbm">Fulfilled by Merchant (FBM)</option>
              <option value="fbu">Fulfilled by Us (FBU)</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Your default - can be overridden per product.
            </p>
          </div>
        </div>

        {error && <p className="text-sm mt-4" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <Button onClick={handleUpgrade} disabled={submitting} className="w-full mt-6">
          {submitting ? "Upgrading..." : "Become a Merchant"}
        </Button>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          <Link to="/" style={{ color: 'var(--color-primary)' }}>Never mind, take me back</Link>
        </p>
      </div>
    </div>
  );
}
