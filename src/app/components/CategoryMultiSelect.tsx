import { useState } from "react";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { api, useAPI } from "../utils/api.js";
import { API_BASE } from "../utils/apiBase.js";
import { useAuth } from "../context/AuthContext";
import type { FieldConfig } from "../types/resources";

interface CategoryOption {
  id: string;
  name: string;
  types: string[];
}

export function CategoryMultiSelect({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { authHeader } = useAuth();
  const { data, refetch } = useAPI(`${API_BASE}${field.optionsFrom}`);
  const options = (data ?? []) as CategoryOption[];

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = Array.isArray(value) ? value : [];
  const categoryType = field.optionsFrom?.split("type=")[1] ?? "";

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  };

  const remove = (name: string) => onChange(selected.filter((n) => n !== name));

  const trimmedSearch = search.trim();
  const exactMatch = options.some((opt) => opt.name.toLowerCase() === trimmedSearch.toLowerCase());

  const handleCreate = async () => {
    if (!trimmedSearch || creating) return;
    setCreating(true);
    try {
      await api.post(`${API_BASE}/categories`, { name: trimmedSearch, types: [categoryType] }, { headers: authHeader });
      await refetch();
      onChange([...selected, trimmedSearch]);
      setSearch("");
    } catch (err: any) {
      toast.error(err.message || "Could not create category");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              {name}
              <button type="button" onClick={() => remove(name)} aria-label={`Remove ${name}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            {selected.length ? `${selected.length} selected` : `Select ${field.label.toLowerCase()}`}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search or create..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                {trimmedSearch ? (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                    Create "{trimmedSearch}"
                  </button>
                ) : (
                  "No categories found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt.id} value={opt.name} onSelect={() => toggle(opt.name)}>
                    <input type="checkbox" checked={selected.includes(opt.name)} readOnly className="h-3.5 w-3.5" />
                    {opt.name}
                  </CommandItem>
                ))}
                {trimmedSearch && !exactMatch && options.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                    Create "{trimmedSearch}"
                  </button>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
