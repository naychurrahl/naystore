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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) openLogin("/become-merchant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role === "merchant") {
    return <Navigate to="/merchant" replace />;
  }

  const handleUpgrade = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await becomeMerchant();
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

        {error && <p className="text-sm mb-4" style={{ color: 'var(--color-error)' }}>{error}</p>}

        <Button onClick={handleUpgrade} disabled={submitting} className="w-full">
          {submitting ? "Upgrading..." : "Become a Merchant"}
        </Button>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          <Link to="/" style={{ color: 'var(--color-primary)' }}>Never mind, take me back</Link>
        </p>
      </div>
    </div>
  );
}
