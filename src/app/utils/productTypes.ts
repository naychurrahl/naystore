// Product types (products.product_type). Only physical products ship, use
// stock and can be paid on delivery; the rest are card-only, one per order.
// Digital, course and ticket go to the buyer's Library; a service is
// something the store sells to shops (store setup, promotion days).
export type ProductType = "physical" | "digital" | "course" | "ticket" | "service";

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  physical: "Physical product",
  digital: "Digital download",
  course: "Online course",
  ticket: "Event ticket",
  service: "For shops",
};

export function isPhysical(type?: string | null): boolean {
  return !type || type === "physical";
}

export function productTypeLabel(type?: string | null): string {
  return PRODUCT_TYPE_LABELS[(type as ProductType) || "physical"] ?? PRODUCT_TYPE_LABELS.physical;
}
