import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Wallet, CheckCircle2, CalendarClock, HandCoins, PauseCircle } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import { PayoutSettingsCard } from "../components/PayoutSettingsCard";
import { payoutStateLabel, toneColors, type PayoutState } from "../utils/payoutState";

const money = (n: number) => `₦${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Commission {
  id: string;
  orderId: string;
  productName: string;
  grossAmount: number;
  commissionType: "percentage" | "flat";
  commissionRate: number;
  commissionAmount: number;
  merchantAmount: number;
  collectedBy: "platform" | "merchant";
  payoutStatus: "pending" | "paid";
  payoutState: PayoutState | null;
  payoutMethod: string | null;
  holdReason: string | null;
  releaseAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

function PayoutStat({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: typeof Wallet; tone: "primary" | "success" | "accent" }) {
  const toneColor = tone === "success" ? 'var(--color-success)' : tone === "accent" ? 'var(--color-accent)' : 'var(--color-primary)';
  const toneBg = tone === "success" ? 'var(--color-success-light)' : tone === "accent" ? 'var(--color-accent-light)' : 'var(--color-primary-light)';
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: toneBg }}>
            <Icon className="h-4 w-4" style={{ color: toneColor }} />
          </div>
        </div>
        <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
        {hint && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function MyPayoutsPage() {
  const { authHeader } = useAuth();
  const { data } = useAPI(`${API_BASE}/my-commissions`, { headers: authHeader });

  const items = (data?.items ?? []) as Commission[];
  const totalPending = data?.totalPending ?? 0;
  const totalPaid = data?.totalPaid ?? 0;
  const due = data?.due ?? 0;
  const owed = data?.owed ?? 0;
  const nextRelease: string | null = data?.nextRelease ?? null;
  const releaseDays = data?.releaseDays ?? 3;
  const minimum = data?.minimum ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>My Payouts</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        {data?.autoPayouts === false
          ? "Payouts are sent by the Naychurrahl team."
          : `Your share of each sale is paid automatically ${releaseDays} day${releaseDays === 1 ? "" : "s"} after it's delivered (downloads and courses: after payment; tickets: after the event), once at least ${money(minimum)} is due.`}
      </p>

      {data?.payoutsHeld && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-2 text-sm" style={{ border: '1px solid var(--color-error)', color: 'var(--color-text-primary)' }}>
          <PauseCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-error)' }} />
          Your payouts are on hold. Contact support to find out why.
        </div>
      )}

      <PayoutSettingsCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PayoutStat label="Next payout" value={money(due)} icon={CalendarClock} tone="primary"
          hint={due > 0 ? "Goes out with the next automatic run" : nextRelease ? `More releases ${new Date(nextRelease.replace(" ", "T")).toLocaleDateString()}` : undefined} />
        <PayoutStat label="Still to come" value={money(totalPending)} icon={Wallet} tone="primary" hint="Waiting for delivery or the release window" />
        <PayoutStat label="Paid to date" value={money(totalPaid)} icon={CheckCircle2} tone="success" />
        {owed > 0 && (
          <PayoutStat label="You owe" value={money(owed)} icon={HandCoins} tone="accent" hint="Commission on cash orders you delivered; taken from your next payout" />
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: 'var(--color-surface-alt)' }}>
              {["Product", "Order", "Sale", "Rate", "Commission", "You Get", "Status", "Date"].map((label, i) => (
                <TableHead
                  key={label}
                  className={`text-[11px] font-semibold uppercase tracking-wider ${i >= 2 && i <= 5 ? "text-right" : ""}`}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const state = payoutStateLabel(item);
              return (
                <TableRow key={item.id}>
                  <TableCell style={{ color: 'var(--color-text-primary)' }}>{item.productName}</TableCell>
                  <TableCell className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.orderId}</TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{money(item.grossAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.commissionType === "flat" ? `${money(item.commissionRate)} flat` : `${item.commissionRate}%`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{money(item.commissionAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {item.collectedBy === "merchant" ? (
                      <span title="You collected the cash for this order, so you owe the commission">
                        Cash collected
                        <span className="block text-[11px] font-normal" style={{ color: 'var(--color-accent)' }}>you owe {money(item.commissionAmount)}</span>
                      </span>
                    ) : money(item.merchantAmount)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium" style={toneColors[state.tone]}>
                      {state.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-14" style={{ color: 'var(--color-text-muted)' }}>
                  No sales yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
