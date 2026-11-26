import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

type Member = { userId: string; name: string | null; email: string | null; role: "owner" | "manager" | "staff" };
type Invite = { id: string; email: string; role: "manager" | "staff"; expiresAt: string };
type Team = { members: Member[]; invites: Invite[] };

const ROLE_NOTE: Record<string, string> = {
  owner: "Everything, including the team, the bank account and payouts, commission and the domain.",
  manager: "Products, orders, delivery fees, coupons, promotions, services, chat, insights and the store page. Not money or the team.",
  staff: "Products, orders and chat.",
};
const field = { borderColor: "var(--color-border)", color: "var(--color-text-primary)", backgroundColor: "var(--color-product-card)" };
const card = { backgroundColor: "var(--color-product-card)", border: "1px solid var(--color-border)" };

// Who runs this store. The owner invites people by email (an account is made
// when they sign up with it), changes roles and takes people off; anyone else
// can see the team and leave.
export function MerchantTeamPage() {
  const { user, store, authHeader, can, refreshStores } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");
  const [busy, setBusy] = useState(false);
  const owner = can("team");

  const load = () => api.get(`${API_BASE}/my-store/team`, { headers: authHeader }).then(setTeam).catch((e: any) => toast.error(e.message || "Couldn't load the team"));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (go: () => Promise<Team>, done: string) => {
    setBusy(true);
    try {
      setTeam(await go());
      toast.success(done);
    } catch (e: any) {
      toast.error(e.message || "That didn't work");
    } finally {
      setBusy(false);
    }
  };

  const invite = () => run(async () => {
    const t = await api.post(`${API_BASE}/my-store/team`, { email: email.trim(), role }, { headers: authHeader });
    setEmail("");
    return t;
  }, "Added. They'll get an email.");

  const leave = async () => {
    setBusy(true);
    try {
      await api.delete(`${API_BASE}/my-store/team/${encodeURIComponent(user!.id)}`, { headers: authHeader });
      toast.success(`You've left ${store?.name}`);
      await refreshStores();
      navigate("/merchant", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "That didn't work");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Team</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          The people who run {store?.name ?? "this store"}. Each works with their own login, and can work for other stores too.
        </p>
      </div>

      {owner && (
        <section className="rounded-xl p-5 space-y-3" style={card}>
          <h2 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>Add someone</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their email address" aria-label="Their email address"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm" style={field} />
            <select value={role} onChange={(e) => setRole(e.target.value as "manager" | "staff")} aria-label="Role" className="px-3 py-2 rounded-lg border text-sm" style={field}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
            <button type="button" disabled={busy || !email.trim()} onClick={() => void invite()} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-ink, #fff)" }}>Add</button>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            <strong>{role === "manager" ? "Manager" : "Staff"}:</strong> {ROLE_NOTE[role]} Someone without an account gets an email invite; they join when they sign up with that address (within 7 days).
          </p>
        </section>
      )}

      <section className="rounded-xl overflow-hidden" style={card}>
        {!team && <p className="p-5 text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        <ul>
          {team?.members.map((m) => (
            <li key={m.userId} className="p-4 flex flex-wrap items-center gap-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <span className="min-w-0 flex-1">
                <span className="block font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{m.name ?? m.email}{m.userId === user?.id ? " (you)" : ""}</span>
                <span className="block text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{m.email}</span>
              </span>
              {owner && m.role !== "owner" ? (
                <>
                  <select value={m.role} disabled={busy} aria-label={`Role for ${m.name ?? m.email}`} className="px-2 py-1.5 rounded-md border text-sm" style={field}
                    onChange={(e) => void run(() => api.put(`${API_BASE}/my-store/team/${encodeURIComponent(m.userId)}`, { role: e.target.value }, { headers: authHeader }), "Role changed")}>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                  <button type="button" disabled={busy} className="text-sm underline" style={{ color: "var(--color-error)" }}
                    onClick={() => void run(() => api.delete(`${API_BASE}/my-store/team/${encodeURIComponent(m.userId)}`, { headers: authHeader }), "Taken off the team")}>Remove</button>
                </>
              ) : (
                <span className="text-sm capitalize px-2 py-1 rounded-md" style={{ backgroundColor: "var(--color-surface-alt)", color: "var(--color-text-secondary)" }}>{m.role}</span>
              )}
            </li>
          ))}
          {team?.invites.map((i) => (
            <li key={i.id} className="p-4 flex flex-wrap items-center gap-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <span className="min-w-0 flex-1">
                <span className="block font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{i.email}</span>
                <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>Invited as {i.role} · until {new Date(i.expiresAt.replace(" ", "T")).toLocaleDateString()}</span>
              </span>
              {owner && (
                <button type="button" disabled={busy} className="text-sm underline" style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => void run(async () => { await api.delete(`${API_BASE}/my-store/invites/${encodeURIComponent(i.id)}`, { headers: authHeader }); return api.get(`${API_BASE}/my-store/team`, { headers: authHeader }); }, "Invite withdrawn")}>Withdraw</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl p-5 space-y-2 text-sm" style={card}>
        <h2 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>What each role can do</h2>
        {(["owner", "manager", "staff"] as const).map((r) => (
          <p key={r} style={{ color: "var(--color-text-secondary)" }}><strong className="capitalize" style={{ color: "var(--color-text-primary)" }}>{r}:</strong> {ROLE_NOTE[r]}</p>
        ))}
      </section>

      {store && store.role !== "owner" && (
        <button type="button" disabled={busy} onClick={() => void leave()} className="text-sm underline" style={{ color: "var(--color-error)" }}>Leave {store.name}</button>
      )}
    </div>
  );
}
