import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ChevronRight, Package } from "lucide-react";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

function GuestProfile() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-md w-full mx-4 p-8 rounded-xl text-center" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Your Account</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Log in or create an account to manage your profile and see your order history.
        </p>
        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full px-6 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="block w-full px-6 py-3 rounded-lg font-medium transition-colors border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            Create Account
          </Link>
        </div>
        <Link
          to="/orders"
          className="flex items-center justify-between p-4 rounded-lg mt-6 transition-colors"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            <Package className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            Track a Guest Order
          </span>
          <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        </Link>
      </div>
    </div>
  );
}

export function Profile() {
  const { user, token, authHeader, setUser, logout } = useAuth();
  const [details, setDetails] = useState({ name: "", username: "", email: "", phone: "", address: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDetails({
        name: user.name ?? "",
        username: user.username ?? "",
        email: user.email,
        phone: user.phone ?? "",
        address: user.address ?? "",
      });
    }
  }, [user]);

  if (!user || !token) {
    return <GuestProfile />;
  }

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Account</h1>
          <button
            onClick={() => logout()}
            className="text-sm font-medium"
            style={{ color: 'var(--color-error)' }}
          >
            Log Out
          </button>
        </div>

        <div className="p-6 rounded-xl mb-6" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Account Details</h2>
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Full Name</label>
              <input
                type="text"
                value={details.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Username</label>
              <input
                type="text"
                value={details.username}
                onChange={(e) => setDetails({ ...details, username: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Optional. Lets you log in with a username instead of your email.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Email</label>
              <input
                type="email"
                value={details.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Phone</label>
              <input
                type="text"
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Address</label>
              <input
                type="text"
                value={details.address}
                onChange={(e) => setDetails({ ...details, address: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Saved here, this fills in automatically at checkout.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingDetails}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {savingDetails ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="p-6 rounded-xl mb-6" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Current Password</label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
            {passwordError && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{passwordError}</p>}
            <button
              type="submit"
              disabled={savingPassword}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {savingPassword ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        <Link
          to="/orders"
          className="flex items-center justify-between p-6 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Order History</span>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
        </Link>
      </div>
    </div>
  );
}
