import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { PasswordInput } from "../components/PasswordInput";
import { PhoneInput } from "../components/PhoneInput";

export function MerchantProfilePage() {
  const { user, authHeader, setUser } = useAuth();
  const [details, setDetails] = useState({ name: "", legalName: "", username: "", email: "", phone: "" });
  const [phoneValid, setPhoneValid] = useState(true);
  const [legalNameLocked, setLegalNameLocked] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // The legal name and its lock come from the profile itself (the stored
  // login user doesn't carry them).
  useEffect(() => {
    if (!user) return;
    setDetails((prev) => ({ ...prev, name: user.name ?? "", username: user.username ?? "", email: user.email }));
    api.get(`${API_BASE}/profile`, { headers: authHeader })
      .then((p: any) => {
        setDetails((prev) => ({ ...prev, legalName: p.legalName ?? "", phone: p.phone ?? "" }));
        setLegalNameLocked(!!p.legalNameLocked);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!details.phone.trim() || !phoneValid) {
      toast.error(details.phone.trim() ? "Check your phone number - include the country code if it isn't Nigerian" : "Add a phone number for your shop");
      return;
    }
    setSavingDetails(true);
    try {
      const updated = await api.put(`${API_BASE}/profile`, details, { headers: authHeader });
      setUser(updated);
      setLegalNameLocked(!!updated.legalNameLocked);
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
            <Label className="mb-1.5 block">Shop name</Label>
            <Input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block">Legal name</Label>
            <Input
              value={details.legalName}
              disabled={legalNameLocked}
              placeholder="As it appears on your bank account"
              onChange={(e) => setDetails({ ...details, legalName: e.target.value })}
            />
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              {legalNameLocked
                ? <><Lock className="h-3 w-3" /> Locked because your payout bank account uses it. Contact support to change it.</>
                : "Payouts only go to a bank account in this name or your shop's name."}
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block">Username (optional)</Label>
            <Input value={details.username} onChange={(e) => setDetails({ ...details, username: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="merchant-profile-phone" className="mb-1.5 block">Phone</Label>
            <PhoneInput
              id="merchant-profile-phone"
              required
              value={details.phone}
              onChange={(phone, valid) => {
                setDetails((prev) => ({ ...prev, phone }));
                setPhoneValid(valid);
              }}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>So buyers and our team can reach your shop.</p>
          </div>
          <Button type="submit" disabled={savingDetails}>{savingDetails ? "Saving..." : "Save Changes"}</Button>
        </form>
      </div>

      <div className="p-6 rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Current Password</Label>
            <PasswordInput
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">New Password</Label>
            <PasswordInput
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
