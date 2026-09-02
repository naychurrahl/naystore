import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { router } from "../routes";

// Rendered as a sibling of <RouterProvider> in App.tsx (so it can overlay
// any route tree, including the ones outside the storefront Layout), which
// means it sits outside the router's own React context - useNavigate() would
// throw here, so this uses the router's imperative navigate() instead.
export function LoginModal() {
  const { isOpen, redirectTo, close } = useAuthModal();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIdentifier("");
      setPassword("");
      setError(null);
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(identifier, password);
      close();
      router.navigate(redirectTo ?? "/profile", { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid email/username or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={close}
    >
      <div
        className="max-w-md w-full p-8 rounded-xl relative"
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

        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: "var(--color-text-primary)" }}>Log In</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Email or Username</label>
            <input
              type="text"
              required
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
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
          <button
            type="button"
            onClick={() => {
              close();
              router.navigate("/register");
            }}
            style={{ color: "var(--color-primary)" }}
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
