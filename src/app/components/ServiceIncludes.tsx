import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

// What a service the store sells to shops includes (products of type
// "service": a store setup and/or promotion days), and who can buy it.
export interface ServiceSpec {
  setup?: boolean;
  premiumMonths?: number;
  days?: { featured_shop?: number; product?: number; category?: number };
  bookFrom?: string | null;
  bookUntil?: string | null;
  saleUntil?: string | null;
}

const PLACE_LABEL: Record<string, string> = { featured_shop: "Featured shop", product: "Home page product", category: "Category placement" };
const date = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function serviceLines(spec?: ServiceSpec | null): string[] {
  if (!spec) return [];
  const lines: string[] = [];
  if (spec.setup) lines.push("We set up your store: up to 30 products uploaded with descriptions, and your shop styled");
  if (spec.premiumMonths) lines.push(`${spec.premiumMonths} months of the premium store: your own domain, and no store branding on your shop`);
  for (const place of ["featured_shop", "product", "category"] as const) {
    const n = Number(spec.days?.[place] ?? 0);
    if (n > 0) lines.push(`${n} ${PLACE_LABEL[place]} ${n === 1 ? "day" : "days"} on the home page, on dates you choose`);
  }
  return lines;
}

export function ServiceIncludes({ spec, className = "" }: { spec?: ServiceSpec | null; className?: string }) {
  const { user } = useAuth();
  const lines = serviceLines(spec);
  const isShop = user?.role === "merchant";
  return (
    <div className={`rounded-lg p-4 space-y-2 ${className}`} style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-secondary)" }}>
      <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>For shops. What you get:</p>
      <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {(spec?.bookFrom || spec?.bookUntil) && (
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Promotion days run {spec.bookFrom ? `from ${date(spec.bookFrom)} ` : ""}{spec.bookUntil ? `until ${date(spec.bookUntil)}` : ""}.
        </p>
      )}
      {spec?.saleUntil && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>On sale until {date(spec.saleUntil)}.</p>}
      {!isShop && (
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Only shops can buy this. {user ? <Link to="/become-merchant" className="underline">Open a shop</Link> : "Log in with your shop account to buy it."}
        </p>
      )}
    </div>
  );
}
