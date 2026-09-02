import { useLocation, useParams, Link } from "react-router";
import { ArrowLeft, Truck, ExternalLink, Package } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { getGuestId } from "../utils/guestId.js";
import { useAuth } from "../context/AuthContext";
import { FULFILLMENT_LABELS } from "../components/FulfillmentStatus";
import { NotFound } from "./NotFound";

function FulfillmentCard({ fulfillment }: { fulfillment: any }) {
  const location = [fulfillment.city, fulfillment.state, fulfillment.country].filter(Boolean).join(", ");
  const isDelivered = fulfillment.status === "delivered";
  return (
    <div className="p-4 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
          <Truck className="h-4 w-4" />
          {fulfillment.merchantName ?? "Fulfilled by us"}
        </span>
        <span
          className="text-xs px-2 py-1 rounded font-medium"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          {FULFILLMENT_LABELS[fulfillment.status] ?? fulfillment.status}
        </span>
      </div>
      <div className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
        {location && !isDelivered && <p>Location: {location}</p>}
        {fulfillment.contactPhone && <p>Contact phone: {fulfillment.contactPhone}</p>}
        {fulfillment.contactEmail && <p>Contact email: {fulfillment.contactEmail}</p>}
        {fulfillment.meta?.trackingId && <p>Tracking ID: {fulfillment.meta.trackingId}</p>}
        {fulfillment.meta?.trackingLink && (
          <a
            href={fulfillment.meta.trackingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            Track shipment <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const stateOrder = (location.state as { order?: any } | null)?.order;
  const { token, authHeader, user } = useAuth();

  const guestId = !user ? getGuestId() : null;

  const { data: myOrdersData, loading: myOrdersLoading } = useAPI(
    !stateOrder && token ? `${API_BASE}/my-orders` : null,
    { headers: authHeader }
  );
  const { data: guestOrdersData, loading: guestOrdersLoading } = useAPI(
    !stateOrder && guestId ? `${API_BASE}/guest-orders?guestId=${encodeURIComponent(guestId)}` : null
  );

  const fetchedOrders = ((token ? myOrdersData : guestOrdersData) ?? []) as any[];
  const loading = !stateOrder && (token ? myOrdersLoading : guestOrdersLoading);
  const order = stateOrder ?? fetchedOrders.find((o) => o.id === id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return <NotFound />;
  }

  const paymentLine =
    order.paymentMethod === "cod"
      ? "Cash on Delivery"
      : order.paymentStatus === "success"
      ? "Paid by card"
      : order.paymentStatus === "failed"
      ? "Card payment failed"
      : "Card payment pending";

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm mb-6" style={{ color: 'var(--color-primary)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>

        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Order {order.id}</h1>
          <span
            className="text-xs px-2 py-1 rounded font-medium capitalize"
            style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            {order.status}
          </span>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
          {paymentLine}
          {order.createdAt ? ` · Placed ${new Date(order.createdAt).toLocaleString()}` : ""}
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div className="p-4 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <h2 className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delivery details</h2>
            <div className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
              <p>{order.customerName}</p>
              <p>{order.address}</p>
              <p>{order.phone}</p>
              <p>{order.email}</p>
              {order.notes && <p className="italic mt-2">Note: {order.notes}</p>}
            </div>
          </div>

          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Items</h2>
            {order.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{item.quantity} × {item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 mt-2" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)' }}>
              <span>Subtotal</span>
              <span>${order.subtotal}</span>
            </div>
            <div className="flex justify-between font-bold" style={{ color: 'var(--color-text-primary)' }}>
              <span>Total</span>
              <span>${order.total}</span>
            </div>
          </div>
        </div>

        <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Package className="h-4 w-4" /> Shipments
        </h2>
        <div className="space-y-3">
          {(order.fulfillments ?? []).map((f: any) => (
            <FulfillmentCard key={f.id} fulfillment={f} />
          ))}
        </div>
      </div>
    </div>
  );
}
