import { useState, type FormEvent, type ReactNode } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { ImageUploadField } from "./ImageUploadField";
import { CategoryMultiSelect } from "./CategoryMultiSelect";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import type { ResourceConfig, FieldConfig } from "../types/resources";

// Field types whose control needs the full form width rather than sharing a
// two-column row with another field.
const FULL_WIDTH_TYPES = new Set(["textarea", "image", "multiselect-create", "checkbox-group", "checkbox"]);

function initialFormData(fields: FieldConfig[], initialData: Record<string, any> | null): Record<string, any> {
  const data: Record<string, any> = {};
  for (const field of fields) {
    let value = initialData ? initialData[field.key] : undefined;
    if (field.type === "tags" && Array.isArray(value)) {
      value = value.join(", ");
    }
    if (value === undefined) {
      value = field.defaultValue ?? (field.type === "checkbox" ? false : field.type === "multiselect-create" || field.type === "checkbox-group" ? [] : "");
    }
    data[field.key] = value;
  }
  if (initialData?.id) data.id = initialData.id;
  return data;
}

// Groups fields into their declared sections, preserving each field's
// position within its section and each section's position by its first
// field - fields without a section fall into a single unlabeled group.
function groupFields(fields: FieldConfig[]): { section: string; fields: FieldConfig[] }[] {
  const groups: { section: string; fields: FieldConfig[] }[] = [];
  for (const field of fields) {
    const section = field.section ?? "";
    let group = groups.find((g) => g.section === section);
    if (!group) {
      group = { section, fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
}

function CategorySelect({ field, value, onChange }: { field: FieldConfig; value: any; onChange: (v: any) => void }) {
  const { data } = useAPI(`${API_BASE}${field.optionsFrom}`);
  const options = (data ?? []) as any[];

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FieldBlock({
  field,
  required,
  value,
  onChange,
}: {
  field: FieldConfig;
  required: boolean;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <div
        className="flex items-center justify-between gap-4 px-3.5 py-3 rounded-lg"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <Label className="mb-0">{field.label}</Label>
          {field.helpText && (
            <p className="text-xs mt-1 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>{field.helpText}</p>
          )}
        </div>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }

  return (
    <div>
      <Label className="mb-1.5 block">
        {field.label}{required && " *"}
      </Label>

      {field.type === "textarea" && (
        <Textarea required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={4} />
      )}

      {(field.type === "text" || field.type === "password" || field.type === "date") && (
        <Input
          type={field.type === "password" ? "password" : field.type === "date" ? "date" : "text"}
          required={required}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.helpText}
        />
      )}

      {field.type === "number" && (
        <Input type="number" step="any" required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.type === "tags" && (
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="tag one, tag two, tag three" />
      )}

      {field.type === "image" && (
        <ImageUploadField value={value ?? ""} onChange={onChange} folder={field.folder || "site"} />
      )}

      {field.type === "select" && field.optionsFrom && (
        <CategorySelect field={field} value={value} onChange={onChange} />
      )}

      {field.type === "multiselect-create" && (
        <CategoryMultiSelect field={field} value={value ?? []} onChange={onChange} />
      )}

      {field.type === "checkbox-group" && field.options && (
        <div className="flex flex-wrap gap-4">
          {field.options.map((opt) => {
            const selected: string[] = value ?? [];
            const checked = selected.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter((v) => v !== opt) : [...selected, opt])}
                  className="h-4 w-4"
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {field.type === "select" && field.options && (() => {
        // Radix's Select rejects an empty-string item value outright, so a
        // field whose options include "" (e.g. "leave blank to inherit a
        // default") needs a real sentinel to represent that choice - only
        // engaged when the field actually offers a blank option, so every
        // other select keeps its original undefined-when-unset behavior.
        const hasBlankOption = field.options.includes("");
        const BLANK = "__blank__";
        return (
          <Select
            value={value || (hasBlankOption ? BLANK : undefined)}
            onValueChange={(v) => onChange(v === BLANK ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt || BLANK} value={opt || BLANK}>{opt || "— None —"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })()}

      {field.helpText && field.type !== "text" && field.type !== "password" && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{field.helpText}</p>
      )}
    </div>
  );
}

export function ResourceForm({
  config,
  initialData,
  onSuccess,
  onCancel,
  extraSection,
}: {
  config: ResourceConfig;
  initialData: Record<string, any> | null;
  onSuccess: () => void;
  onCancel: () => void;
  // An extra labeled section rendered after the config-driven fields, e.g.
  // commission negotiation on Products - see ResourceTable's formExtra prop.
  extraSection?: { label: string; content: ReactNode } | null;
}) {
  const { authHeader } = useAuth();
  const isEdit = !!initialData;
  const [formData, setFormData] = useState(() => initialFormData(config.fields, initialData));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleFields = config.fields.filter((f) => !(isEdit && f.createOnly) && !(!isEdit && f.hideOnCreate));
  const groups = groupFields(visibleFields);

  const setValue = (key: string, value: any) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, any> = {};
    for (const field of config.fields) {
      if (isEdit && field.createOnly) continue;
      if (!isEdit && field.hideOnCreate) continue;
      if (field.type === "password" && isEdit && !formData[field.key]) continue; // blank = unchanged
      if (field.type === "tags") {
        payload[field.key] = String(formData[field.key] ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        continue;
      }
      payload[field.key] = formData[field.key];
    }

    try {
      if (isEdit) {
        payload.id = initialData!.id;
        const url = config.putIdInUrl ? `${API_BASE}${config.endpoint}/${initialData!.id}` : `${API_BASE}${config.endpoint}`;
        await api.put(url, payload, { headers: authHeader });
      } else {
        await api.post(`${API_BASE}${config.endpoint}`, payload, { headers: authHeader });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {groups.map((group, i) => (
        <div key={group.section || i}>
          {group.section && (
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-3 pb-2"
              style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}
            >
              {group.section}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.fields.map((field) => (
              <div key={field.key} className={FULL_WIDTH_TYPES.has(field.type) ? "sm:col-span-2" : ""}>
                <FieldBlock
                  field={field}
                  required={!!(field.required || (!isEdit && field.requiredOnCreate))}
                  value={formData[field.key]}
                  onChange={(v) => setValue(field.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {extraSection && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-3 pb-2"
            style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}
          >
            {extraSection.label}
          </p>
          {extraSection.content}
        </div>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

      <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
