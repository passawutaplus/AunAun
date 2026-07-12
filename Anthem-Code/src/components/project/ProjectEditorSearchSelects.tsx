import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CategoryPickerProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function ProjectCategoryPicker({
  value,
  options,
  onChange,
  placeholder = "เลือกหมวดหมู่",
  disabled,
  invalid,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((c) => c.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive focus:ring-destructive/40",
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b border-border/60 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาหมวดหมู่..."
              className="h-9 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบหมวดหมู่</p>
          ) : (
            filtered.map((c) => {
              const selected = c === value;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted/70",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{c}</span>
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type SeriesOption = {
  id: string;
  title: string;
  is_public?: boolean | null;
};

type SeriesPickerProps = {
  value: string;
  options: SeriesOption[];
  onChange: (value: string) => void;
  onCreateNew: () => void;
  placeholder?: string;
  disabled?: boolean;
};

export function ProjectSeriesPicker({
  value,
  options,
  onChange,
  onCreateNew,
  placeholder = "ไม่ใส่ในชุด",
  disabled,
}: SeriesPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    const hit = options.find((s) => s.id === value);
    if (!hit) return placeholder;
    return hit.is_public === false ? `${hit.title} (ส่วนตัว)` : hit.title;
  }, [options, placeholder, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((s) => s.title.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b border-border/60 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชุดงาน..."
              className="h-9 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              !value ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted/70",
            )}
          >
            <span className="min-w-0 flex-1 truncate">ไม่ใส่ในชุด</span>
            {!value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
          </button>
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบชุดงาน</p>
          ) : (
            filtered.map((s) => {
              const selected = s.id === value;
              const label = s.is_public === false ? `${s.title} (ส่วนตัว)` : s.title;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted/70",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-border/60 p-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery("");
              onCreateNew();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            เพิ่มชุดงานใหม่
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
