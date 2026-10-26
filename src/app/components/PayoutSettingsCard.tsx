import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Building2, CheckCircle2, Wallet } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

interface PayoutSettings {
  method: "wallet" | "bank" | null;
  bank: { bankCode: string; bankName: string | null; accountNumber: string; accountName: string } | null;
  walletConnected: boolean;
}

interface Profile {
  name: string | null;
  legalName: string | null;
  legalNameLocked: boolean;
}

type AccountType = "personal" | "business";

// "How you get paid": the merchant's Naylet wallet, or a bank account in
// their own legal name or their shop's name. The account is checked with
// the bank only when it's saved, and the bank's name for it is only shown
// once it matches. Admin pays out to whichever is chosen here.
export function PayoutSettingsCard() {
  const { authHeader } = useAuth();
  const opts = { headers: authHeader };
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, refetch } = useAPI(`${API_BASE}/payout-settings`, opts);
  const settings = data as PayoutSettings | null;
  const { data: profileData, refetch: refetchProfile } = useAPI(`${API_BASE}/profile`, opts);
  const profile = profileData as Profile | null;

  const [choice, setChoice] = useState<"wallet" | "bank" | null>(null);
  const [banks, setBanks] = useState<{ code: string; name: string }[] | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [legalNameDraft, setLegalNameDraft] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings && choice === null) setChoice(settings.method ?? "bank");
  }, [settings]);

  // Back from connecting Naylet (wallet-connect?return=payouts).
  useEffect(() => {
    const result = searchParams.get("wallet");
    if (!result) return;
    if (result === "connected") toast.success("Naylet wallet connected");
    else toast.error("Could not connect your Naylet wallet");
    setChoice("wallet");
    setSearchParams((params) => {
      params.delete("wallet");
      params.delete("reason");
      return params;
    }, { replace: true });
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (choice !== "bank" || banks) return;
    api.get(`${API_BASE}/payout-settings/banks`, opts)
      .then(setBanks)
      .catch((err: any) => setError(err.message || "Could not load banks"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  const save = async (body: Record<string, string>) => {
    setSaving(true);
    setError(null);
    try {
      // A personal account is checked against the legal name, so it has to
      // be there first - and it locks once the account is saved.
      if (body.method === "bank" && body.accountType === "personal" && !profile?.legalName) {
        if (!legalNameDraft.trim()) {
          setError("Enter your legal name, exactly as your bank has it");
          return;
        }
        await api.put(`${API_BASE}/profile`, { legalName: legalNameDraft.trim() }, opts);
      }
      const saved = await api.put(`${API_BASE}/payout-settings`, body, opts) as PayoutSettings;
      toast.success(saved.method === "bank" && saved.bank ? `Payouts will go to ${saved.bank.accountName}` : "Payout method saved");
      setBankCode("");
      setAccountNumber("");
      await Promise.all([refetch(), refetchProfile()]);
    } catch (err: any) {
      setError(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const connectWallet = async () => {
    try {
      const { url } = await api.get(`${API_BASE}/wallet-connect?return=payouts`, opts);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Could not start the Naylet connection");
    }
  };

  if (!settings || !profile) return null;

  const current = settings.method === "bank" && settings.bank
    ? `${settings.bank.bankName ?? "Bank"} ····${settings.bank.accountNumber.slice(-4)} (${settings.bank.accountName})`
    : settings.method === "wallet"
    ? `Naylet wallet${settings.walletConnected ? "" : " - not connected any more, reconnect it"}`
    : null;

  const canSave = !!bankCode && /^\d{10}$/.test(accountNumber) && (accountType === "business" || !!profile.legalName || !!legalNameDraft.trim());

  return (
    <Card className="mb-6">
      <CardContent className="pt-6 space-y-4">
        <div>
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>How you get paid</h2>
          <p className="text-sm" style={{ color: current ? 'var(--color-text-secondary)' : 'var(--color-accent)' }}>
            {current ? <>Payouts go to: <strong>{current}</strong></> : "Choose how you'd like to receive your payouts."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payout method">
          {([
            { value: "bank", label: "Bank account", icon: Building2 },
            { value: "wallet", label: "Naylet wallet", icon: Wallet },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={choice === value}
              onClick={() => { setChoice(value); setError(null); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                border: `1px solid ${choice === value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: choice === value ? 'var(--color-primary-light)' : 'transparent',
                color: 'var(--color-text-primary)',
              }}
            >
              <Icon className="h-4 w-4" /> {label}
              {settings.method === value && <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-success)' }} />}
            </button>
          ))}
        </div>

        {choice === "wallet" && (
          <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p>Payouts arrive in your Naylet wallet as RT (₦1 = 1 RT) the moment admin pays out.</p>
            {settings.walletConnected ? (
              settings.method !== "wallet" && (
                <Button type="button" size="sm" disabled={saving} onClick={() => void save({ method: "wallet" })}>
                  Use my Naylet wallet
                </Button>
              )
            ) : (
              <Button type="button" size="sm" onClick={() => void connectWallet()}>Connect your Naylet wallet</Button>
            )}
          </div>
        )}

        {choice === "bank" && (
          <div className="space-y-3 max-w-md">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {settings.bank ? "Change the account payouts go to." : "Payouts are sent by bank transfer through Paystack."}{" "}
              The account must be in your own name or your shop's name - we check with your bank when you save.
            </p>

            <div className="space-y-1.5" role="radiogroup" aria-label="Whose name the account is in">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>The account is in</p>
              {([
                { value: "personal", label: "My name", name: profile.legalName },
                { value: "business", label: "My shop's name", name: profile.name },
              ] as const).map(({ value, label, name }) => (
                <label key={value} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <input type="radio" name="accountType" checked={accountType === value} onChange={() => { setAccountType(value); setError(null); }} />
                  <span>{label}{name ? <> (<strong style={{ color: 'var(--color-text-primary)' }}>{name}</strong>)</> : ""}</span>
                </label>
              ))}
            </div>

            {accountType === "personal" && !profile.legalName && (
              <div className="space-y-1">
                <Input
                  placeholder="Your legal name, as on your bank account"
                  value={legalNameDraft}
                  onChange={(e) => setLegalNameDraft(e.target.value)}
                  aria-label="Legal name"
                />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Once a bank account is saved with it, your legal name can only be changed by contacting support.
                </p>
              </div>
            )}

            <select
              value={bankCode}
              onChange={(e) => { setBankCode(e.target.value); setError(null); }}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background)' }}
              aria-label="Bank"
            >
              <option value="">{banks ? "Choose your bank" : "Loading banks…"}</option>
              {(banks ?? []).map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <Input
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit account number"
              value={accountNumber}
              onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, "")); setError(null); }}
              aria-label="Account number"
            />
            <Button
              type="button"
              size="sm"
              disabled={!canSave || saving}
              onClick={() => void save({ method: "bank", accountType, bankCode, accountNumber, bankName: banks?.find((b) => b.code === bankCode)?.name ?? "" })}
            >
              {saving ? "Checking with your bank…" : "Save this account"}
            </Button>
            {settings.method !== "bank" && settings.bank && !bankCode && (
              <Button type="button" size="sm" variant="outline" disabled={saving}
                onClick={() => void save({ method: "bank", accountType, bankCode: settings.bank!.bankCode, accountNumber: settings.bank!.accountNumber })}>
                Use {settings.bank.bankName} ····{settings.bank.accountNumber.slice(-4)} again
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
      </CardContent>
    </Card>
  );
}
