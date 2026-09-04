import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

export function MerchantProfilePage() {
  const { user, authHeader, setUser } = useAuth();
  const [details, setDetails] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setDetails({ name: user.name ?? "", email: user.email });
  }, [user]);

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      const updated = await api.put(`${API_BASE}/profile`, details, { headers: authHeader });
      setUser(updated);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Could not update profile");
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await api.put(`${API_BASE}/profile`, passwordForm, { headers: authHeader });
      setPasswordForm({ currentPassword: "", password: "" });
      toast.success("Password changed");
    } catch (err: any) {
      setPasswordError(err.message || "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>My Profile</h1>
      <p className="text-sm mb-6 capitalize" style={{ color: 'var(--color-text-muted)' }}>{user?.role}</p>

      <div className="p-6 rounded-xl mb-6" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Account Details</h2>
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Name</Label>
            <Input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
          </div>
          <Button type="submit" disabled={savingDetails}>{savingDetails ? "Saving..." : "Save Changes"}</Button>
        </form>
      </div>

      <div className="p-6 rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Current Password</Label>
            <Input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">New Password</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={passwordForm.password}
              onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
            />
          </div>
          {passwordError && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{passwordError}</p>}
          <Button type="submit" disabled={savingPassword}>{savingPassword ? "Changing..." : "Change Password"}</Button>
        </form>
      </div>
    </div>
  );
}
