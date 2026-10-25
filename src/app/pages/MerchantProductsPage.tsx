import { Link } from "react-router";
import { GraduationCap } from "lucide-react";
import { ResourceTable } from "../components/ResourceTable";
import { CommissionNegotiation } from "../components/CommissionNegotiation";
import { ProductFilesPanel } from "../components/ProductFilesPanel";
import { merchantProductsConfig } from "../types/resources";

export function MerchantProductsPage() {
  return (
    <ResourceTable
      config={merchantProductsConfig}
      formExtra={(row, refetch) => [
        ...(row.productType === "digital"
          ? [{ label: "Files", content: <ProductFilesPanel productId={row.id} /> }]
          : []),
        ...(row.productType === "course"
          ? [{
              label: "Course content",
              content: (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {row.lessonCount
                      ? `${row.lessonCount} lesson${row.lessonCount === 1 ? "" : "s"} so far.`
                      : "No lessons yet - buyers can't enrol until you add at least one."}
                  </p>
                  <Link
                    to={`/merchant/products/${encodeURIComponent(row.id)}/course`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    <GraduationCap className="h-4 w-4" /> Open course builder
                  </Link>
                </div>
              ),
            }]
          : []),
        {
          label: "Commission",
          content: <CommissionNegotiation product={row} onUpdated={refetch} />,
        },
      ]}
    />
  );
}
