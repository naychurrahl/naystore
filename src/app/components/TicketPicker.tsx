import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Globe, MapPin, Minus, Plus, ShoppingCart } from "lucide-react";
import { useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { formatEventRange, formatEventTime } from "../utils/eventTime";
import { useCart, lineKey } from "../context/CartContext";

interface PublicTier {
  id: string;
  name: string;
  description: string;
  price: number;
  remaining: number | null;
}

interface PublicEvent {
  startsAt: string;
  endsAt: string | null;
  locationType: "venue" | "online";
  venueName: string | null;
  venueAddress: string | null;
  salesCloseAt: string;
  salesOpen: boolean;
  ended: boolean;
}

// When/where of an event and its ticket types, with a quantity per type -
// each chosen type goes into the cart as its own line.
export function TicketPicker({ product }: { product: { id: string; name: string; image: string; codEligible: boolean } }) {
  const { items, addItem } = useCart();
  const { data, loading } = useAPI(`${API_BASE}/events/${encodeURIComponent(product.id)}`);
  const [counts, setCounts] = useState<Record<string, number>>({});

  if (loading) return <p className="mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading tickets…</p>;
  const info = data as { configured: boolean; event: PublicEvent | null; tiers: PublicTier[]; maxPerOrder: number } | null;
  const event = info?.event;

  if (!info?.configured || !event || info.tiers.length === 0) {
    return (
      <p className="mb-6 p-4 rounded-lg text-sm" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
        Tickets go on sale soon.
      </p>
    );
  }

  const inCart = (tierId: string) =>
    items.find((i) => lineKey(i) === lineKey({ productId: product.id, tierId }))?.quantity ?? 0;
  const maxFor = (tier: PublicTier) =>
    Math.max(0, Math.min(info.maxPerOrder - inCart(tier.id), tier.remaining ?? Infinity));
  const total = info.tiers.reduce((sum, t) => sum + (counts[t.id] ?? 0) * t.price, 0);
  const chosen = info.tiers.filter((t) => (counts[t.id] ?? 0) > 0);

  const add = () => {
    for (const tier of chosen) {
      addItem({ ...product, price: tier.price, productType: "ticket", tierId: tier.id, tierName: tier.name }, counts[tier.id]);
    }
    const n = chosen.reduce((sum, t) => sum + counts[t.id], 0);
    toast.success(`Added ${n} ticket${n === 1 ? "" : "s"} to cart`);
    setCounts({});
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="p-4 rounded-lg space-y-2 text-sm" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
        <p className="flex items-start gap-2">
          <CalendarDays className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
          {formatEventRange(event.startsAt, event.endsAt)}
        </p>
        {event.locationType === "online" ? (
          <p className="flex items-start gap-2">
            <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
            Online event &mdash; the joining link is on your ticket.
          </p>
        ) : (
          <p className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
            {[event.venueName, event.venueAddress].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      {event.ended ? (
        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>This event has ended.</p>
      ) : !event.salesOpen ? (
        <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Ticket sales have closed.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {info.tiers.map((tier) => {
              const count = counts[tier.id] ?? 0;
              const soldOut = tier.remaining === 0;
              const max = maxFor(tier);
              return (
                <li key={tier.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {tier.name} <span className="font-bold">₦{tier.price}</span>
                    </p>
                    {tier.description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tier.description}</p>}
                    {soldOut ? (
                      <p className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>Sold out</p>
                    ) : tier.remaining !== null && tier.remaining <= 20 ? (
                      <p className="text-xs" style={{ color: 'var(--color-accent)' }}>{tier.remaining} left</p>
                    ) : null}
                  </div>
                  {!soldOut && (
                    <div className="flex items-center rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
                      <button
                        type="button"
                        onClick={() => setCounts({ ...counts, [tier.id]: Math.max(0, count - 1) })}
                        disabled={count === 0}
                        className="p-2 disabled:opacity-40"
                        style={{ color: 'var(--color-text-primary)' }}
                        aria-label={`Fewer ${tier.name} tickets`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{count}</span>
                      <button
                        type="button"
                        onClick={() => setCounts({ ...counts, [tier.id]: Math.min(max, count + 1) })}
                        disabled={count >= max}
                        className="p-2 disabled:opacity-40"
                        style={{ color: 'var(--color-text-primary)' }}
                        aria-label={`More ${tier.name} tickets`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={add}
            disabled={chosen.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-cart-button)', color: 'white' }}
          >
            <ShoppingCart className="h-5 w-5" />
            {chosen.length ? `Add to cart · ₦${total}` : "Choose your tickets"}
          </button>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Sales close {formatEventTime(event.salesCloseAt)} WAT. Tickets are emailed with a QR code right after payment.
          </p>
        </>
      )}
    </div>
  );
}
