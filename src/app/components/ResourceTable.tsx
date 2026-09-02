import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import type { ResourceConfig } from "../types/resources";

function CellValue({ value }: { value: any }) {
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

export function ResourceTable({
  config,
  rowActions,
}: {
  config: ResourceConfig;
  // Extra per-row control(s) rendered in the Actions column, e.g. the
  // Commission negotiation button on Products - kept as a prop rather than
  // part of ResourceConfig since it needs JSX (config files stay plain data).
  rowActions?: (row: Record<string, any>, refetch: () => void) => ReactNode;
}) {
  const { user, authHeader } = useAuth();
  const { data, loading, error, refetch } = useAPI(`${API_BASE}${config.listEndpoint ?? config.endpoint}`, { headers: authHeader });
  const rows = (data ?? []) as any[];
  const canCreate = !config.hideCreate && (!config.adminOnlyCreate || user?.role === "admin");
  const canDeleteBase = !config.hideDelete && (!config.adminOnlyDelete || user?.role === "admin");
  const rowCanDelete = (row: Record<string, any>) => canDeleteBase && (!config.canDeleteRow || config.canDeleteRow(row, user));
  const hasActionsColumn = canDeleteBase || !!rowActions;

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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{config.label}</h1>
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
        <div className="rounded-lg overflow-x-auto" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-product-card)' }}>
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                {hasActionsColumn && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} onClick={() => openEdit(row)} className="cursor-pointer">
                  {config.columns.map((col) => (
                    <TableCell key={col.key}><CellValue value={row[col.key]} /></TableCell>
                  ))}
                  {hasActionsColumn && (
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {rowActions?.(row, refetch)}
                        {rowCanDelete(row) && (
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
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={config.columns.length + (hasActionsColumn ? 1 : 0)} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                    No {config.label.toLowerCase()} yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRow ? `Edit ${config.label.slice(0, -1)}` : `Add ${config.label.slice(0, -1)}`}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            config={config}
            initialData={editingRow}
            onSuccess={() => { setDialogOpen(false); refetch(); toast.success("Saved"); }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
