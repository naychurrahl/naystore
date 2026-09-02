import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Wallet, CheckCircle2 } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

const money = (n: number) => `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export function MyPayoutsPage() {
  const { authHeader } = useAuth();
  const { data } = useAPI(`${API_BASE}/my-commissions`, { headers: authHeader });

  const items = (data?.items ?? []) as Commission[];
  const totalPending = data?.totalPending ?? 0;
  const totalPaid = data?.totalPaid ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>My Payouts</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        What you're owed and what's already been paid out, per order line.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Owed to You</CardTitle>
            <Wallet className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{money(totalPending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Paid to Date</CardTitle>
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-success)' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{money(totalPaid)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Sale</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">You Get</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.productName}</TableCell>
                <TableCell className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.orderId}</TableCell>
                <TableCell className="text-right">{money(item.grossAmount)}</TableCell>
                <TableCell className="text-right">
                  {item.commissionType === "flat" ? `${money(item.commissionRate)} flat` : `${item.commissionRate}%`}
                </TableCell>
                <TableCell className="text-right">{money(item.commissionAmount)}</TableCell>
                <TableCell className="text-right font-medium">{money(item.merchantAmount)}</TableCell>
                <TableCell>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
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
                <TableCell colSpan={8} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
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
