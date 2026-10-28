import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router";
import { Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { Button } from "../components/ui/button";
import { NIGERIA_STATE_LGAS, NIGERIA_STATES } from "../data/nigeriaStates";
import { PhoneInput } from "../components/PhoneInput";

export function BecomeMerchant() {
  const { user, becomeMerchant } = useAuth();
  const { openLogin } = useAuthModal();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState("");
  const [legalName, setLegalName] = useState(user?.name ?? "");
  const [commissionType, setCommissionType] = useState<"percentage" | "flat">("percentage");
  const [commissionRate, setCommissionRate] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"fbu" | "fbm">("fbm");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  // Merchants need one - buyers and the team have to be able to reach the shop.
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [phoneValid, setPhoneValid] = useState(true);
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
    if (!shopName.trim()) {
      setError("Enter your shop name");
      return;
    }
    if (!legalName.trim()) {
      setError("Enter your legal name");
      return;
    }
    const rate = Number(commissionRate);
    if (!commissionRate || Number.isNaN(rate) || rate < 0) {
      setError("Enter a valid, non-negative commission rate");
      return;
    }
    if (!location.trim()) {
      setError("Enter your shop's location");
      return;
    }
    if (!state) {
      setError("Select your state");
      return;
    }
    if (!lga) {
      setError("Select your LGA");
      return;
    }
    if (!area.trim()) {
      setError("Enter your area");
      return;
    }
    if (!phone.trim() || !phoneValid) {
      setError(phone.trim() ? "Check your phone number - include the country code if it isn't Nigerian" : "Add a phone number for your shop");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await becomeMerchant(commissionType, rate, fulfillmentMethod, location.trim(), state, lga, area.trim(), landmark.trim(), shopName.trim(), legalName.trim(), phone);
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
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Shop name</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Shown on your products and shop page.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Your legal name</label>
            <input
              type="text"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              As it appears on your bank account. Payouts only go to an account in this name or your shop's name.
            </p>
          </div>

          <div>
            <label htmlFor="merchant-phone" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Phone</label>
            <PhoneInput
              id="merchant-phone"
              required
              value={phone}
              onChange={(next, valid) => {
                setPhone(next);
                setPhoneValid(valid);
              }}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>So buyers and our team can reach your shop.</p>
          </div>

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

          <div className="p-3 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Shop Location</p>

            <div className="flex gap-2">
              <select
                required
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setLga("");
                }}
                className="flex-1 px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <option value="" disabled>Select state</option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                required
                disabled={!state}
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <option value="" disabled>{state ? "Select LGA" : "Select state first"}</option>
                {(NIGERIA_STATE_LGAS[state] ?? []).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <input
              type="text"
              required
              placeholder="Area, e.g. Ikeja GRA"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />

            <input
              type="text"
              placeholder="Landmark (optional), e.g. Near Shoprite"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />

            <input
              type="text"
              required
              placeholder="e.g. 12 Allen Avenue, Ibadan"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
