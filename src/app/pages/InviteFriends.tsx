import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Copy, Gift, MessageCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";

type Reward = { id: string; amount: number; status: "pending" | "unlocked" | "paid" | "void"; unlockAt: string | null; paidAt: string | null; voidReason: string | null };
type InviteData = {
  code: string;
  link: string;
  enabled: boolean;
  friendGets: string;
  youGet: string;
  minSubtotal: number;
  unlockDays: number;
  walletConnected: boolean;
  totals: { paid: number; ready: number; waiting: number };
  friends: { name: string; joinedAt: string; reward: Reward | null }[];
};

const day = (value: string) => new Date(value.replace(" ", "T")).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function rewardText(reward: Reward | null, walletConnected: boolean) {
  if (!reward) return "Hasn't ordered yet";
  switch (reward.status) {
    case "pending":
      return reward.unlockAt ? `₦${reward.amount.toLocaleString()} · unlocks ${day(reward.unlockAt)}` : `₦${reward.amount.toLocaleString()} · waiting for delivery`;
    case "unlocked":
      return walletConnected ? `₦${reward.amount.toLocaleString()} · being paid` : `₦${reward.amount.toLocaleString()} · connect your wallet to get it`;
    case "paid":
      return `₦${reward.amount.toLocaleString()} · paid${reward.paidAt ? ` ${day(reward.paidAt)}` : ""}`;
    default:
      return `No reward${reward.voidReason ? ` · ${reward.voidReason}` : ""}`;
  }
}

export function InviteFriends() {
  const { user, authHeader } = useAuth();
  const { openLogin } = useAuthModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error, refetch } = useAPI(user ? `${API_BASE}/referrals/me` : null, { headers: authHeader });
  const invite = data as InviteData | null;
  const [connecting, setConnecting] = useState(false);

  // Back from connecting Naylet (wallet-connect?return=invite).
  useEffect(() => {
    const result = searchParams.get("wallet");
    if (!result) return;
    if (result === "connected") toast.success("Naylet wallet connected");
    else toast.error("Could not connect your Naylet wallet");
    setSearchParams((params) => {
      params.delete("wallet");
      params.delete("reason");
      return params;
    }, { replace: true });
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = { backgroundColor: "var(--color-product-card)", border: "1px solid var(--color-border)" };

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <Gift className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Invite friends</h1>
          <p className="mb-6" style={{ color: "var(--color-text-secondary)" }}>Log in to get your invite link.</p>
          <button onClick={() => openLogin("/invite")} className="px-6 py-3 rounded-lg font-medium" style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Couldn't copy - select it and copy it yourself");
    }
  };

  const connectWallet = async () => {
    setConnecting(true);
    try {
      const { url } = await api.get(`${API_BASE}/wallet-connect?return=invite`, { headers: authHeader });
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Could not start the wallet connection");
      setConnecting(false);
    }
  };

  const shareText = invite
    ? `Get ${invite.friendGets} your first order with my invite: ${invite.link}`
    : "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Invite friends</h1>

        {loading && !invite && <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        {error && !invite && <p style={{ color: "var(--color-error)" }}>{(error as any).message || "Could not load your invites"}</p>}

        {invite && (
          <>
            <p className="mb-6" style={{ color: "var(--color-text-secondary)" }}>
              {invite.enabled
                ? <>Your friends get <strong>{invite.friendGets}</strong> their first order{invite.minSubtotal > 0 ? ` of ₦${invite.minSubtotal.toLocaleString()} or more` : ""}. You get <strong>{invite.youGet}</strong> in your Naylet wallet {invite.unlockDays} days after it's delivered.</>
                : "Invites are paused right now. Rewards you've already earned are still paid."}
            </p>

            <div className="p-6 rounded-xl mb-6" style={card}>
              <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>Your invite code</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold tracking-widest" style={{ color: "var(--color-text-primary)" }}>{invite.code}</span>
                <button onClick={() => copy(invite.code, "Code")} aria-label="Copy code" title="Copy code">
                  <Copy className="h-5 w-5" style={{ color: "var(--color-text-muted)" }} />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input readOnly value={invite.link} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
                <button onClick={() => copy(invite.link, "Link")} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  style={{ border: "1px solid var(--color-primary)", color: "var(--color-primary)" }}>
                  <Copy className="h-4 w-4" /> Copy link
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2" style={{ backgroundColor: "#25D366", color: "white" }}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>

            {!invite.walletConnected && (
              <div className="p-4 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center gap-3" style={card}>
                <Wallet className="h-6 w-6 shrink-0" style={{ color: "var(--color-primary)" }} />
                <p className="flex-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Rewards are paid in RT to your Naylet wallet. Connect it to get paid{invite.totals.ready > 0 ? ` - ₦${invite.totals.ready.toLocaleString()} is ready for you` : ""}.
                </p>
                <button onClick={connectWallet} disabled={connecting} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
                  {connecting ? "Opening Naylet…" : "Connect Naylet"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
              {([["Paid", invite.totals.paid], ["Ready", invite.totals.ready], ["On the way", invite.totals.waiting]] as const).map(([label, value]) => (
                <div key={label} className="p-4 rounded-xl text-center" style={card}>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>₦{value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-xl" style={card}>
              <h2 className="font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>Friends who joined</h2>
              {invite.friends.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No one yet. Share your link to get started.</p>
              ) : (
                <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {invite.friends.map((friend, i) => (
                    <li key={i} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                      <span style={{ color: "var(--color-text-primary)" }}>
                        {friend.name} <span style={{ color: "var(--color-text-muted)" }}>· joined {day(friend.joinedAt)}</span>
                      </span>
                      <span style={{ color: friend.reward?.status === "paid" ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                        {rewardText(friend.reward, invite.walletConnected)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
