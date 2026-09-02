import { Truck, ExternalLink } from "lucide-react";

export const FULFILLMENT_LABELS: Record<string, string> = {
  processing: "Processing",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
};

export function FulfillmentStatus({ fulfillment }: { fulfillment: any }) {
  const location = [fulfillment.city, fulfillment.state, fulfillment.country].filter(Boolean).join(", ");
  const isDelivered = fulfillment.status === "delivered";
  return (
    <div className="flex items-center justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
      <span className="flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5" />
        {FULFILLMENT_LABELS[fulfillment.status] ?? fulfillment.status}
        {location && !isDelivered && ` · ${location}`}
      </span>
      {fulfillment.meta?.trackingLink && (
        <a
          href={fulfillment.meta.trackingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1"
          style={{ color: 'var(--color-primary)' }}
        >
          Track <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
