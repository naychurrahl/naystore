import { useState, type ReactNode } from "react";
import { Plus, Trash2, Inbox, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { ResourceForm } from "./ResourceForm";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import type { ColumnConfig, ResourceConfig } from "../types/resources";

// Mirrors the backend's LOW_STOCK_THRESHOLD (Functions.php) so the pill
// agrees with the dashboard's own low-stock count.
const LOW_STOCK_THRESHOLD = 5;

function CellValue({ column, value }: { column: ColumnConfig; value: any }) {
  if (column.image) {
    return (
      <div className="h-10 w-10 rounded-md overflow-hidden shrink-0" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {value ? <ImageWithFallback src={value} alt="" className="w-full h-full object-cover" /> : null}
      </div>
    );
  }
  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
  }
  if (Array.isArray(value)) {
    return value.length ? <>{value.join(", ")}</> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  }
  if (value === null || value === undefined || value === "") {
    return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  }
  return <>{String(value)}</>;
}

// Out-of-stock/low-stock rows get a tinted background so the whole row
// reads as needing attention, not just the pill - null when in stock (the
// table's normal card background already applies).
function rowStockBg(row: Record<string, any>): string | undefined {
  if (!row.inStock) return 'var(--color-error-light)';
  const qty = row.stockQuantity;
  if (qty !== null && qty !== undefined && qty <= LOW_STOCK_THRESHOLD) return 'var(--color-accent-light)';
  return undefined;
}

function StockToggle({ row, config, refetch }: { row: Record<string, any>; config: ResourceConfig; refetch: () => void }) {
  const { authHeader } = useAuth();
  const [pending, setPending] = useState(false);
  const qty = row.stockQuantity;

  let color = 'var(--color-success)';
  let label = 'In Stock';
  if (!row.inStock) {
    color = 'var(--color-error)'; label = 'Out of Stock';
  } else if (qty !== null && qty !== undefined && qty <= LOW_STOCK_THRESHOLD) {
    color = 'var(--color-accent)'; label = `Low Stock (${qty})`;
  }

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      await api.put(`${API_BASE}${config.endpoint}`, { id: row.id, inStock: !row.inStock }, { headers: authHeader });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update stock status");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleToggle(); }}
      disabled={pending}
      title="Click to mark in stock / out of stock"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium disabled:opacity-70"
      style={{ backgroundColor: 'var(--color-product-card)', border: '1px solid var(--color-border)', color }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {label}
    </button>
  );
}

function VisibleToggle({ row, config, refetch }: { row: Record<string, any>; config: ResourceConfig; refetch: () => void }) {
  const { authHeader } = useAuth();
  const [pending, setPending] = useState(false);
  const visible = !!row.visible;
  // Staff/admin can hide a listing for moderation; once locked, the merchant
  // can't flip it back on themselves - see updateProduct in Functions.php.
  const locked = !!row.visibilityLocked && !visible;

  const handleToggle = async () => {
    if (pending || locked) return;
    setPending(true);
    try {
      await api.put(`${API_BASE}${config.endpoint}`, { id: row.id, visible: !visible }, { headers: authHeader });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update visibility");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleToggle(); }}
      disabled={pending || locked}
      title={locked ? "Hidden by staff for moderation - contact support to have this reviewed" : "Click to toggle"}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium disabled:opacity-70"
      style={{
        backgroundColor: 'var(--color-product-card)',
        border: '1px solid var(--color-border)',
        color: visible ? 'var(--color-success)' : 'var(--color-text-muted)',
        cursor: locked ? 'not-allowed' : 'pointer',
      }}
    >
      {locked ? (
        <Lock className="h-3 w-3" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: visible ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
      )}
      {locked ? "Locked" : visible ? "Visible" : "Hidden"}
    </button>
  );
}

export function ResourceTable({
  config,
  formExtra,
}: {
  config: ResourceConfig;
  // Extra content rendered as its own section inside the edit form, e.g. the
  // Commission negotiation panel on Products - kept as a prop rather than
  // part of ResourceConfig since it needs JSX (config files stay plain data).
  // Only called for an existing row (create has no id to negotiate against).
  formExtra?: (row: Record<string, any>, refetch: () => void) => { label: string; content: ReactNode } | null;
}) {
  const { user, authHeader } = useAuth();
  const { data, loading, error, refetch } = useAPI(`${API_BASE}${config.listEndpoint ?? config.endpoint}`, { headers: authHeader });
  const rows = (data ?? []) as any[];
  const canCreate = !config.hideCreate && (!config.adminOnlyCreate || user?.role === "admin");
  const canDeleteBase = !config.hideDelete && (!config.adminOnlyDelete || user?.role === "admin");
  const rowCanDelete = (row: Record<string, any>) => canDeleteBase && (!config.canDeleteRow || config.canDeleteRow(row, user));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);

  const openCreate = () => { setEditingRow(null); setDialogOpen(true); };
  const openEdit = (row: Record<string, any>) => { setEditingRow(row); setDialogOpen(true); };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`${API_BASE}${config.endpoint}/${id}`, { headers: authHeader });
      toast.success(`${config.label.slice(0, -1)} deleted`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not delete");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{config.label}</h1>
          {!loading && !error && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {rows.length} {rows.length === 1 ? config.label.toLowerCase().slice(0, -1) : config.label.toLowerCase()}
            </p>
          )}
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        )}
      </div>

      {loading && <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--color-error)' }}>Couldn't load {config.label.toLowerCase()}.</p>}

      {!loading && !error && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                  {config.columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)', width: col.image ? '1%' : undefined }}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  {canDeleteBase && (
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} onClick={() => openEdit(row)} className="cursor-pointer" style={{ backgroundColor: rowStockBg(row) }}>
                    {config.columns.map((col) => (
                      <TableCell key={col.key} style={{ color: 'var(--color-text-primary)' }}>
                        {col.toggle ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <VisibleToggle row={row} config={config} refetch={refetch} />
                          </div>
                        ) : col.stock ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <StockToggle row={row} config={config} refetch={refetch} />
                          </div>
                        ) : (
                          <CellValue column={col} value={row[col.key]} />
                        )}
                      </TableCell>
                    ))}
                    {canDeleteBase && (
                      <TableCell className="text-right">
                        {rowCanDelete(row) && (
                          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Delete">
                                  <Trash2 className="h-4 w-4" style={{ color: 'var(--color-error)' }} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this {config.label.toLowerCase().slice(0, -1)}?</AlertDialogTitle>
                                  <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(row.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={config.columns.length + (canDeleteBase ? 1 : 0)} className="py-14">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="h-6 w-6" style={{ color: 'var(--color-text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No {config.label.toLowerCase()} yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRow ? `Edit ${config.label.slice(0, -1)}` : `Add ${config.label.slice(0, -1)}`}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            config={config}
            initialData={editingRow}
            onSuccess={() => { setDialogOpen(false); refetch(); toast.success("Saved"); }}
            onCancel={() => setDialogOpen(false)}
            extraSection={editingRow && formExtra ? formExtra(editingRow, refetch) : null}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
