export type FieldType = "text" | "password" | "number" | "textarea" | "checkbox" | "checkbox-group" | "select" | "multiselect-create" | "image" | "tags" | "date";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  requiredOnCreate?: boolean;
  createOnly?: boolean;
  hideOnCreate?: boolean;
  optionsFrom?: string;
  options?: string[];
  folder?: string;
  helpText?: string;
  defaultValue?: any;
}

export interface ColumnConfig {
  key: string;
  label: string;
}

export interface ResourceConfig {
  key: string;
  label: string;
  endpoint: string;
  columns: ColumnConfig[];
  fields: FieldConfig[];
  putIdInUrl?: boolean;
  // Overrides just the GET-list URL (create/update still hit `endpoint`) -
  // scopes the list to the merchant's own products at /my-products.
  listEndpoint?: string;
  adminOnlyCreate?: boolean;
  adminOnlyDelete?: boolean;
  hideCreate?: boolean;
  hideDelete?: boolean;
  canDeleteRow?: (row: Record<string, any>, user: { role: string } | null) => boolean;
}

// A merchant's own product management view. Delete is a faux delete on the
// backend (deleted_at stamped, row kept for order-history integrity) - it
// just disappears from every list, including this one, with no undo.
// Visibility is freely editable by the merchant - but only while it isn't
// staff/admin-locked; the backend silently drops the visible field on update
// whenever it's locked, so the toggle can look like it "did nothing" in that
// case - the helpText explains why, and the row's real state always wins on
// refetch.
export const merchantProductsConfig: ResourceConfig = {
  key: "my-products",
  label: "Products",
  endpoint: "/products",
  listEndpoint: "/my-products",
  columns: [
    { key: "name", label: "Name" },
    { key: "categories", label: "Categories" },
    { key: "price", label: "Price" },
    { key: "inStock", label: "In Stock" },
    { key: "visible", label: "Visible" },
    { key: "commissionSummary", label: "Commission" },
    { key: "fulfillmentMethod", label: "Fulfillment" },
  ],
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "categories", label: "Categories", type: "multiselect-create", optionsFrom: "/categories?type=product", required: true },
    { key: "price", label: "Price", type: "number", required: true },
    { key: "originalPrice", label: "Original Price", type: "number" },
    { key: "image", label: "Image", type: "image", folder: "products" },
    { key: "description", label: "Description", type: "textarea", required: true },
    { key: "inStock", label: "In Stock", type: "checkbox", defaultValue: true },
    { key: "stockQuantity", label: "Stock Quantity", type: "number", helpText: "Optional. Leave blank if you don't track exact quantity - low-stock alerts only show once this is set." },
    { key: "codEligible", label: "COD Eligible", type: "checkbox", defaultValue: true },
    { key: "badge", label: "Badge", type: "text" },
    { key: "visible", label: "Visible", type: "checkbox", defaultValue: true, helpText: "You can show or hide your own listing. If staff hides it for moderation, only they can turn it back on." },
    {
      key: "fulfillmentMethod", label: "Fulfillment Override", type: "select",
      options: ["", "fbu", "fbm"],
      helpText: "Leave blank to use your default (set on the Orders page). Override per product only if this one needs different handling.",
    },
  ],
};
