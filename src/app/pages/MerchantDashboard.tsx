import { useState } from "react";
import { Link } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DollarSign, Package, PackageX, PackageCheck, ShieldAlert, AlertTriangle, MessageCircle, Wallet, Trophy, TrendingUp, TrendingDown, Hourglass, CheckCircle2, Truck, XCircle } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

const money = (n: number) => `₦${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const trend = (current: number, prior: number): { pct: number; label: string } | null => {
  if (!prior) return null;
  const pct = ((current - prior) / prior) * 100;
  return { pct, label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs prior period` };
};

interface Rank {
  revenue: number;
  units: number;
  orders: number;
  revenueRank: number;
  unitsRank: number;
  ordersRank: number;
  total: number;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </p>
  );
}

function StatCard({
  label, value, sub, trend: trendInfo, icon: Icon, tone = "primary", to,
}: {
  label: string;
  value: string | number;
  sub?: string | null;
  trend?: { pct: number; label: string } | null;
  icon: typeof DollarSign;
  tone?: "primary" | "success" | "error" | "accent" | "muted";
  to?: string;
}) {
  const toneColor = {
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    accent: 'var(--color-accent)',
    muted: 'var(--color-text-muted)',
  }[tone];
  const toneBg = {
    primary: 'var(--color-primary-light)',
    success: 'var(--color-success-light)',
    error: 'var(--color-error-light)',
    accent: 'var(--color-accent-light)',
    muted: 'var(--color-surface-alt)',
  }[tone];

  const body = (
    <Card className="h-full transition-shadow hover:shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: toneBg }}>
            <Icon className="h-4 w-4" style={{ color: toneColor }} />
          </div>
        </div>
        <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
        {trendInfo && (
          <div className="flex items-center gap-1 mt-1.5">
            {trendInfo.pct >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" style={{ color: 'var(--color-error)' }} />
            )}
            <span className="text-xs font-medium" style={{ color: trendInfo.pct >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {trendInfo.label}
            </span>
          </div>
        )}
        {sub && !trendInfo && <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

function RankBadge({ rank, total }: { rank: number; total: number }) {
  return (
    <span
      className="tabular-nums"
      style={rank === 1 ? { color: 'var(--color-accent)', fontWeight: 600 } : undefined}
    >
      #{rank} <span style={{ color: 'var(--color-text-muted)' }}>/ {total}</span>
    </span>
  );
}

function RankRow({ label, rank }: { label: string; rank: Rank | null }) {
  if (!rank) {
    return <TableRow><TableCell>{label}</TableCell><TableCell colSpan={3} className="text-center" style={{ color: 'var(--color-text-muted)' }}>No sales this window</TableCell></TableRow>;
  }
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell className="text-right"><RankBadge rank={rank.revenueRank} total={rank.total} /></TableCell>
      <TableCell className="text-right"><RankBadge rank={rank.unitsRank} total={rank.total} /></TableCell>
      <TableCell className="text-right"><RankBadge rank={rank.ordersRank} total={rank.total} /></TableCell>
    </TableRow>
  );
}

export function MerchantDashboard() {
  const { user, authHeader } = useAuth();
  const [window_, setWindow] = useState("week");
  const { data } = useAPI(`${API_BASE}/merchant-dashboard?window=${window_}`, { headers: authHeader });
  const { data: commissions } = useAPI(`${API_BASE}/my-commissions`, { headers: authHeader });

  const sales = data?.sales ?? { revenue: 0, units: 0, priorRevenue: 0, priorUnits: 0 };
  const inventory = data?.inventory ?? { total: 0, inStock: 0, outOfStock: 0, locked: 0, lowStock: 0 };
  const unreadChats = data?.unreadChats ?? { customers: 0, support: 0 };
  const funnel = data?.orderFunnel ?? { pending: 0, confirmed: 0, fulfilled: 0, cancelled: 0 };
  const ranks = data?.ranks ?? { shop: null, products: [], categories: [] };
  const amountOwed = commissions?.totalPending ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-4">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Welcome, {user?.name || user?.email}
        </h1>
        <Select value={window_} onValueChange={setWindow}>
          <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mb-7" style={{ color: 'var(--color-text-secondary)' }}>Here's how your shop is doing.</p>

      <div className="mb-7">
        <SectionLabel>Sales</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Your Revenue" value={money(sales.revenue)} trend={trend(sales.revenue, sales.priorRevenue)} icon={DollarSign} tone="primary" to="/merchant/products" />
          <StatCard label="Units Sold" value={sales.units} trend={trend(sales.units, sales.priorUnits)} icon={Package} tone="primary" to="/merchant/products" />
          <StatCard label="Amount Owed to You" value={money(amountOwed)} icon={Wallet} tone="success" to="/merchant/payouts" />
        </div>
      </div>

      <div className="mb-7">
        <SectionLabel>Orders</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending" value={funnel.pending} icon={Hourglass} tone="accent" to="/merchant/orders" />
          <StatCard label="Confirmed" value={funnel.confirmed} icon={CheckCircle2} tone="primary" to="/merchant/orders" />
          <StatCard label="Fulfilled" value={funnel.fulfilled} icon={Truck} tone="success" to="/merchant/orders" />
          <StatCard label="Cancelled" value={funnel.cancelled} icon={XCircle} tone="error" to="/merchant/orders" />
        </div>
      </div>

      <div className="mb-7">
        <SectionLabel>Inventory</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="In Stock" value={inventory.inStock} icon={PackageCheck} tone="success" to="/merchant/products" />
          <StatCard label="Out of Stock" value={inventory.outOfStock} icon={PackageX} tone="error" to="/merchant/products" />
          <StatCard label="Low Stock" value={inventory.lowStock} icon={AlertTriangle} tone="accent" to="/merchant/products" />
          <StatCard
            label="Hidden by Staff"
            value={inventory.locked}
            sub={inventory.locked > 0 ? "Contact support to have these reviewed" : null}
            icon={ShieldAlert}
            tone={inventory.locked > 0 ? "error" : "muted"}
            to="/merchant/products"
          />
        </div>
      </div>

      <div className="mb-7">
        <SectionLabel>Messages</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Unread Messages" value={unreadChats.customers + unreadChats.support} icon={MessageCircle} tone="primary" to="/merchant/chat" />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <h2 className="px-5 py-3.5 font-semibold text-sm flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
          <Trophy className="h-4 w-4" style={{ color: 'var(--color-accent)' }} /> Your Rank
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compared to</TableHead>
              <TableHead className="text-right">By Revenue</TableHead>
              <TableHead className="text-right">By Units</TableHead>
              <TableHead className="text-right">By Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <RankRow label="Your shop vs. all merchants" rank={ranks.shop} />
            {ranks.products.map((r: any) => (
              <RankRow key={r.productId} label={`Product: ${r.productName}`} rank={r} />
            ))}
          </TableBody>
        </Table>
      </div>

      {ranks.categories.map((cat: any) => (
        <div key={cat.categoryId} className="rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
          <h2 className="px-5 py-3.5 font-semibold text-sm" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            Rank in "{cat.categoryName}"
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compared to</TableHead>
                <TableHead className="text-right">By Revenue</TableHead>
                <TableHead className="text-right">By Units</TableHead>
                <TableHead className="text-right">By Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <RankRow label="Your shop vs. merchants in this category" rank={cat.shopRank} />
              {cat.productRanks.map((r: any) => (
                <RankRow key={r.productId} label={`Product: ${r.productName}`} rank={r} />
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
