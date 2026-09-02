import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";

export function MerchantSignup() {
  const { registerMerchant } = useAuth();
  const { openLogin } = useAuthModal();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await registerMerchant(name, email, password);
      navigate("/merchant", { replace: true });
    } catch (err: any) {
      setError(err.message || "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-md w-full mx-4 p-8 rounded-xl" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: 'var(--color-text-primary)' }}>Become a Merchant</h1>
        <p className="text-sm mb-6 text-center" style={{ color: 'var(--color-text-muted)' }}>List and sell your own products</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Business Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Password</Label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          Already a merchant?{" "}
          <button type="button" onClick={() => openLogin("/merchant")} style={{ color: 'var(--color-primary)' }}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
