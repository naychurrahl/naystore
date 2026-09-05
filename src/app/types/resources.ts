export type FieldType = "text" | "password" | "number" | "textarea" | "checkbox" | "checkbox-group" | "select" | "multiselect-create" | "image" | "tags" | "date" | "fulfillment";

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
  // Groups fields under an uppercase section heading in ResourceForm. Fields
  // sharing a section render together even if not adjacent in this array -
  // the array's field order still controls each field's position within its
  // section, and a section's own position is set by its first field.
  section?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  // Renders a small thumbnail instead of the raw value - the column still
  // needs a real key (the field holding the image path/URL).
  image?: boolean;
  // Renders a red/amber/green stock-level pill computed from the row's
  // inStock/stockQuantity fields, instead of the raw value.
  stock?: boolean;
  // Renders the boolean value as a click-to-toggle pill that PUTs the
  // flipped value straight back via config.endpoint, instead of a static badge.
  toggle?: boolean;
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
  // Kept deliberately narrow - just enough to scan and act on at a glance.
  // Categories, commission, and fulfillment override are edit-only details,
  // reachable through the row's own form.
  columns: [
    { key: "image", label: "", image: true },
    { key: "name", label: "Name" },
    { key: "inStock", label: "Stock", stock: true },
    { key: "price", label: "Price" },
    { key: "visible", label: "Visible", toggle: true },
  ],
  fields: [
    { key: "name", label: "Name", type: "text", required: true, section: "Basics" },
    { key: "categories", label: "Categories", type: "multiselect-create", optionsFrom: "/categories?type=product", required: true, section: "Basics" },
    { key: "description", label: "Description", type: "textarea", required: true, section: "Basics" },
    { key: "image", label: "Image", type: "image", folder: "products", section: "Photo" },
    { key: "price", label: "Price", type: "number", required: true, section: "Pricing & Stock" },
    { key: "originalPrice", label: "Original Price", type: "number", section: "Pricing & Stock" },
    { key: "inStock", label: "In Stock", type: "checkbox", defaultValue: true, section: "Pricing & Stock" },
    { key: "stockQuantity", label: "Stock Quantity", type: "number", helpText: "Optional. Leave blank if you don't track exact quantity - low-stock alerts only show once this is set.", section: "Pricing & Stock" },
    { key: "codEligible", label: "COD Eligible", type: "checkbox", defaultValue: true, section: "Settings" },
    { key: "badge", label: "Badge", type: "text", section: "Settings" },
    { key: "visible", label: "Visible", type: "checkbox", defaultValue: true, helpText: "You can show or hide your own listing. If staff hides it for moderation, only they can turn it back on.", section: "Settings" },
    {
      key: "fulfillmentMethod", label: "Fulfillment", type: "fulfillment",
      helpText: "Stays on \"Inherit my default\" unless this product needs different handling from what you set on the Orders page.",
      section: "Settings",
    },
  ],
};
