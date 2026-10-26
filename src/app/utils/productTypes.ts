// Product types (products.product_type). Only physical products ship, use
// stock and can be paid on delivery; the rest are card-only, one per order,
// and delivered through the buyer's Library.
export type ProductType = "physical" | "digital" | "course" | "ticket";

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  physical: "Physical product",
  digital: "Digital download",
  course: "Online course",
  ticket: "Event ticket",
};

export function isPhysical(type?: string | null): boolean {
  return !type || type === "physical";
}

// Downloads and courses live in the buyer's account, so guests can't buy
// them (physical goods and tickets are fine). Mirrors the backend's
// ACCOUNT_ONLY_TYPES.
export function requiresAccount(type?: string | null): boolean {
  return type === "digital" || type === "course";
}

export function productTypeLabel(type?: string | null): string {
  return PRODUCT_TYPE_LABELS[(type as ProductType) || "physical"] ?? PRODUCT_TYPE_LABELS.physical;
}
