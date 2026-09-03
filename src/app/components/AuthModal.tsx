import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { router } from "../routes";

const inputStyle = { borderColor: "var(--color-border)", color: "var(--color-text-primary)" };
const labelStyle = { color: "var(--color-text-primary)" };

// Rendered as a sibling of <RouterProvider> in App.tsx (so it can overlay any
// route tree, including ones outside the storefront Layout), which means it
// sits outside the router's own React context - useNavigate() would throw
// here, so this uses the router's imperative navigate() instead. Login and
// register share this one overlay (and one backdrop style) so switching
// between them - "Create one" / "Already have an account?" - never closes
// and reopens a separate modal.
export function AuthModal() {
  const { isOpen, mode, redirectTo, defaultUsertype, switchMode, close } = useAuthModal();
  const { login, register } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [usertype, setUsertype] = useState<"customer" | "merchant">(defaultUsertype);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [commissionType, setCommissionType] = useState<"percentage" | "flat">("percentage");
  const [commissionRate, setCommissionRate] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"fbu" | "fbm">("fbm");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIdentifier("");
      setLoginPassword("");
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setCommissionType("percentage");
      setCommissionRate("");
      setFulfillmentMethod("fbm");
      setUsertype(defaultUsertype);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(identifier, loginPassword);
      close();
      router.navigate(redirectTo ?? "/profile", { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid email/username or password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (usertype === "merchant") {
      const rate = Number(commissionRate);
      if (!commissionRate || Number.isNaN(rate) || rate < 0) {
        setError("Enter a valid, non-negative commission rate");
        return;
      }
    }

    setSubmitting(true);
    try {
      await register({
        usertype,
        name,
        email,
        password,
        username: usertype === "customer" && username ? username : undefined,
        ...(usertype === "merchant"
          ? { commissionType, commissionRate: Number(commissionRate), fulfillmentMethod }
          : {}),
      });
      close();
      router.navigate(redirectTo ?? (usertype === "merchant" ? "/merchant" : "/profile"), { replace: true });
    } catch (err: any) {
      setError(err.message || "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 9, 16, 0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={close}
    >
      <div
        className="max-w-md w-full p-8 rounded-xl relative max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-product-card)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-md"
          style={{ color: "var(--color-text-muted)" }}
        >
          <X className="h-5 w-5" />
        </button>

        {mode === "login" ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center" style={labelStyle}>Log In</h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Email or Username</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={inputStyle}
                />
              </div>

              {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                {submitting ? "Logging in..." : "Log In"}
              </button>
            </form>

            <p className="mt-6 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
              Don't have an account?{" "}
              <button type="button" onClick={() => switchMode("register")} style={{ color: "var(--color-primary)" }}>
                Create one
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center" style={labelStyle}>Create Account</h1>

            <div className="flex rounded-lg border p-1 mb-5" style={{ borderColor: "var(--color-border)" }}>
              {(["customer", "merchant"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUsertype(t)}
                  className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
                  style={
                    usertype === t
                      ? { backgroundColor: "var(--color-primary)", color: "white" }
                      : { color: "var(--color-text-secondary)" }
                  }
                >
                  {t === "customer" ? "Shop" : "Sell"}
                </button>
              ))}
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  {usertype === "merchant" ? "Business Name" : "Full Name"}
                </label>
                <input
                  type="text"
                  required={usertype === "merchant"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={inputStyle}
                />
              </div>

              {usertype === "customer" && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Username (optional)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border"
                    style={inputStyle}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                    Lets you log in with a username instead of your email, if you'd rather.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border"
                  style={inputStyle}
                />
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>At least 8 characters.</p>
              </div>

              {usertype === "merchant" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Commission</label>
                    <div className="flex gap-2">
                      <select
                        value={commissionType}
                        onChange={(e) => setCommissionType(e.target.value as "percentage" | "flat")}
                        className="px-3 py-3 rounded-lg border"
                        style={inputStyle}
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
                        style={inputStyle}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                      What we take per sale - admins can revise this later.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Logistics</label>
                    <select
                      value={fulfillmentMethod}
                      onChange={(e) => setFulfillmentMethod(e.target.value as "fbu" | "fbm")}
                      className="w-full px-4 py-3 rounded-lg border"
                      style={inputStyle}
                    >
                      <option value="fbm">Fulfilled by Merchant (FBM)</option>
                      <option value="fbu">Fulfilled by Us (FBU)</option>
                    </select>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                      Your default - can be overridden per product.
                    </p>
                  </div>
                </>
              )}

              {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                {submitting ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("login")} style={{ color: "var(--color-primary)" }}>
                Log in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
