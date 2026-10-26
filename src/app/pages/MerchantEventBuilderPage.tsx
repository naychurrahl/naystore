import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { EventBuilder } from "../components/EventBuilder";

export function MerchantEventBuilderPage() {
  const { id = "" } = useParams();

  return (
    <div className="space-y-4">
      <Link to="/merchant/products" className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--color-primary)' }}>
        <ArrowLeft className="h-4 w-4" /> Back to My Products
      </Link>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Event &amp; tickets</h1>
      <EventBuilder productId={id} scannerHref={`/check-in/${encodeURIComponent(id)}`} />
    </div>
  );
}
