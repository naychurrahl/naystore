import { BadgeCheck } from "lucide-react";

// A shop in the founding offer (data/Offers.php, `foundingShop` on products
// and shop profiles). Small beside a product's shop name; larger on the
// shop's own page.
export function FoundingBadge({ show, large = false }: { show?: boolean | null; large?: boolean }) {
  if (!show) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${large ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-[11px]"}`}
      style={{ border: "1px solid var(--color-primary, currentColor)", color: "var(--color-primary, currentColor)" }}
      title="One of the first shops on the store"
    >
      <BadgeCheck className={large ? "h-4 w-4" : "h-3 w-3"} aria-hidden /> Founding Shop
    </span>
  );
}
