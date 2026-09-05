import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Wallet, CheckCircle2 } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

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
  payoutStatus: "pending" | "paid";
  paidAt: string | null;
  createdAt: string;
}

function PayoutStat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Wallet; tone: "primary" | "success" }) {
  const toneColor = tone === "success" ? 'var(--color-success)' : 'var(--color-primary)';
  const toneBg = tone === "success" ? 'var(--color-success-light)' : 'var(--color-primary-light)';
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

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>My Payouts</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        What you're owed and what's already been paid out, per order line.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <PayoutStat label="Owed to You" value={money(totalPending)} icon={Wallet} tone="primary" />
        <PayoutStat label="Paid to Date" value={money(totalPaid)} icon={CheckCircle2} tone="success" />
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
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell style={{ color: 'var(--color-text-primary)' }}>{item.productName}</TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.orderId}</TableCell>
                <TableCell className="text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{money(item.grossAmount)}</TableCell>
                <TableCell className="text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                  {item.commissionType === "flat" ? `${money(item.commissionRate)} flat` : `${item.commissionRate}%`}
                </TableCell>
                <TableCell className="text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{money(item.commissionAmount)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium" style={{ color: 'var(--color-text-primary)' }}>{money(item.merchantAmount)}</TableCell>
                <TableCell>
                  <span
                    className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize"
                    style={{
                      backgroundColor: item.payoutStatus === "paid" ? 'var(--color-success-light)' : 'var(--color-accent-light)',
                      color: item.payoutStatus === "paid" ? 'var(--color-success)' : 'var(--color-accent)',
                    }}
                  >
                    {item.payoutStatus}
                  </span>
                </TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
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
