import { useLocation, Link } from "react-router";
import { CheckCircle2, XCircle, Package, ChevronRight } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { FulfillmentStatus } from "../components/FulfillmentStatus";

function OrderCard({ order, highlight = false }: { order: any; highlight?: boolean }) {
  const paymentLine =
    order.paymentMethod === "cod"
      ? "Cash on Delivery"
      : order.paymentStatus === "success"
      ? "Paid by card"
      : order.paymentStatus === "failed"
      ? "Card payment failed"
      : "Card payment pending";

  return (
    <Link
      to={`/orders/${order.id}`}
      state={{ order }}
      className="block p-4 rounded-lg transition-colors"
      style={{ border: highlight ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{order.id}</span>
        <span
          className="text-xs px-2 py-1 rounded font-medium capitalize"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          {order.status}
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {paymentLine}
        {order.createdAt ? ` · ${new Date(order.createdAt).toLocaleDateString()}` : ""}
      </p>
      {order.items.map((item: any, index: number) => (
        <div key={index} className="flex justify-between text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{item.quantity} × {item.name}</span>
          <span>₦{(item.price * item.quantity).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-between font-bold pt-2 mt-2" style={{ color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)' }}>
        <span>Total</span>
        <span>₦{order.total}</span>
      </div>
      {(order.fulfillments ?? []).map((f: any) => (
        <FulfillmentStatus key={f.id} fulfillment={f} />
      ))}
      <div className="flex items-center justify-end gap-0.5 pt-2 mt-1 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
        View details <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

export function OrderHistory() {
  const { token, authHeader, user } = useAuth();
  const { openLogin } = useAuthModal();
  const location = useLocation();
  const state = (location.state ?? {}) as { placedOrders?: any[]; paymentFailed?: boolean };
  const justPlaced = state.placedOrders ?? [];
  const paymentFailed = state.paymentFailed ?? false;

  // Guests have no account to fetch by, but the same browser-persisted guestId
  // used at checkout lets them look up their own past orders here.
  const guestId = !user ? getGuestId() : null;

  const { data: myOrdersData, loading: myOrdersLoading } = useAPI(
    token ? `${API_BASE}/my-orders` : null,
    { headers: authHeader }
  );
  const { data: guestOrdersData, loading: guestOrdersLoading } = useAPI(
    guestId ? `${API_BASE}/guest-orders?guestId=${encodeURIComponent(guestId)}` : null
  );

  const orders = ((token ? myOrdersData : guestOrdersData) ?? []) as any[];
  const loading = token ? myOrdersLoading : guestOrdersLoading;

  const justPlacedIds = new Set(justPlaced.map((o) => o.id));
  const historyOrders = orders.filter((o) => !justPlacedIds.has(o.id));

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>Order History</h1>

        {justPlaced.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              {paymentFailed ? (
                <XCircle className="h-6 w-6" style={{ color: 'var(--color-error)' }} />
              ) : (
                <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--color-success)' }} />
              )}
              <h2 className="font-bold" style={{ color: paymentFailed ? 'var(--color-error)' : 'var(--color-success)' }}>
                {paymentFailed ? "Payment not completed" : justPlaced.length > 1 ? "Orders placed!" : "Order placed!"}
              </h2>
            </div>
            <div className="space-y-4">
              {justPlaced.map((order) => (
                <OrderCard key={order.id} order={order} highlight />
              ))}
            </div>
          </div>
        )}

        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
          {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Loading orders...</p>}

          {!loading && historyOrders.length === 0 && justPlaced.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>No orders yet.</p>
              <Link to="/#shop" style={{ color: 'var(--color-primary)' }}>Browse the shop</Link>
            </div>
          )}

          <div className="space-y-4">
            {historyOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>

        {!token && (
          <p className="text-sm text-center mt-4" style={{ color: 'var(--color-text-secondary)' }}>
            Orders shown above are matched to this browser.{" "}
            <button onClick={() => openLogin("/orders")} style={{ color: 'var(--color-primary)' }}>Log in</button> to keep a permanent history tied to your account.
          </p>
        )}
      </div>
    </div>
  );
}
