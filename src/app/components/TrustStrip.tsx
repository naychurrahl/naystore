import { LifeBuoy, RotateCcw, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Reliable shipping, right to your door",
  },
  {
    icon: ShieldCheck,
    title: "Secure Checkout",
    description: "Your payment details are always protected",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "Not the right fit? We'll sort it out",
  },
  {
    icon: LifeBuoy,
    title: "Friendly Support",
    description: "Real help, whenever you need it",
  },
];

export function TrustStrip() {
  return (
    <div style={{ backgroundColor: 'var(--color-product-card)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {ITEMS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-center gap-3">
            <div
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                {title}
              </p>
              <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
