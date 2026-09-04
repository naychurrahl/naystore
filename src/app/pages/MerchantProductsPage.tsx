import { ResourceTable } from "../components/ResourceTable";
import { CommissionNegotiation } from "../components/CommissionNegotiation";
import { merchantProductsConfig } from "../types/resources";

export function MerchantProductsPage() {
  return (
    <ResourceTable
      config={merchantProductsConfig}
      formExtra={(row, refetch) => ({
        label: "Commission",
        content: <CommissionNegotiation product={row} onUpdated={refetch} />,
      })}
    />
  );
}
