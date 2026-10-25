import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { CourseBuilder } from "../components/CourseBuilder";

export function MerchantCourseBuilderPage() {
  const { id = "" } = useParams();

  return (
    <div className="space-y-4">
      <Link to="/merchant/products" className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--color-primary)' }}>
        <ArrowLeft className="h-4 w-4" /> Back to My Products
      </Link>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Course builder</h1>
      <CourseBuilder productId={id} previewHref={`/learn/${encodeURIComponent(id)}`} />
    </div>
  );
}
