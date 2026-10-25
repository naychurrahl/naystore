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
        {
          label: "Commission",
          content: <CommissionNegotiation product={row} onUpdated={refetch} />,
        },
      ]}
    />
  );
}
