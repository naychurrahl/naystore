import { useState } from "react";
import { Link } from "react-router";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DollarSign, Package, AlertTriangle, MessageCircle, Wallet, Trophy } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";

const money = (n: number) => `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const trendLabel = (current: number, prior: number) => {
  if (!prior) return null;
  const pct = ((current - prior) / prior) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs prior period`;
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

function StatCard({ label, value, sub, icon: Icon, to }: { label: string; value: string | number; sub?: string | null; icon: typeof DollarSign; to?: string }) {
  const body = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</CardTitle>
        <Icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block transition-shadow hover:shadow-md">{body}</Link> : body;
}

function RankRow({ label, rank }: { label: string; rank: Rank | null }) {
  if (!rank) {
    return <TableRow><TableCell>{label}</TableCell><TableCell colSpan={3} className="text-center" style={{ color: 'var(--color-text-muted)' }}>No sales this window</TableCell></TableRow>;
  }
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell className="text-right">#{rank.revenueRank} / {rank.total}</TableCell>
      <TableCell className="text-right">#{rank.unitsRank} / {rank.total}</TableCell>
      <TableCell className="text-right">#{rank.ordersRank} / {rank.total}</TableCell>
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
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Welcome, {user?.name || user?.email}
        </h1>
        <Select value={window_} onValueChange={setWindow}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>Here's how your shop is doing.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Your Revenue" value={money(sales.revenue)} sub={trendLabel(sales.revenue, sales.priorRevenue)} icon={DollarSign} to="/merchant/products" />
        <StatCard label="Units Sold" value={sales.units} sub={trendLabel(sales.units, sales.priorUnits)} icon={Package} to="/merchant/products" />
        <StatCard label="Amount Owed to You" value={money(amountOwed)} icon={Wallet} />
        <StatCard label="Low Stock" value={inventory.lowStock} icon={AlertTriangle} to="/merchant/products" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="In Stock" value={inventory.inStock} icon={Package} to="/merchant/products" />
        <StatCard label="Out of Stock" value={inventory.outOfStock} icon={AlertTriangle} to="/merchant/products" />
        <StatCard label="Hidden by Staff" value={inventory.locked} sub={inventory.locked > 0 ? "Contact support to have these reviewed" : null} icon={AlertTriangle} to="/merchant/products" />
        <StatCard label="Unread Messages" value={unreadChats.customers + unreadChats.support} icon={MessageCircle} to="/merchant/chat" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Orders" value={funnel.pending} icon={Package} />
        <StatCard label="Confirmed" value={funnel.confirmed} icon={Package} />
        <StatCard label="Fulfilled" value={funnel.fulfilled} icon={Package} />
        <StatCard label="Cancelled" value={funnel.cancelled} icon={Package} />
      </div>

      <div className="rounded-lg overflow-hidden mb-6" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
        <h2 className="px-4 py-3 font-semibold text-sm flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
          <Trophy className="h-4 w-4" style={{ color: 'var(--color-primary)' }} /> Your Rank
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
        <div key={cat.categoryId} className="rounded-lg overflow-hidden mb-6" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
          <h2 className="px-4 py-3 font-semibold text-sm" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
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
