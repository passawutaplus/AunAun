import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const OTHER_CHIP_ID = "__other__";

type ChipOption = { id: string; label: string };

type Props = {
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Known preset ids — anything else counts as custom “อื่นๆ”. */
  knownIds?: Set<string> | readonly string[];
  otherPlaceholder?: string;
  className?: string;
};

function toKnownSet(knownIds: Props["knownIds"], options: ChipOption[]): Set<string> {
  if (knownIds instanceof Set) return knownIds;
  if (knownIds) return new Set(knownIds);
  return new Set(options.map((o) => o.id));
}

export function ChipMultiSelectWithOther({
  options,
  selected,
  onChange,
  knownIds,
  otherPlaceholder = "พิมพ์แล้วกด Enter",
  className,
}: Props) {
  const known = toKnownSet(knownIds, options);
  const customValues = selected.filter((id) => !known.has(id));
  const [otherOpen, setOtherOpen] = useState(customValues.length > 0);
  const [draft, setDraft] = useState("");

  const selectedSet = new Set(selected);
  const otherActive = otherOpen || customValues.length > 0;

  const togglePreset = (id: string) => {
    if (selectedSet.has(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  const toggleOther = () => {
    if (otherActive) {
      setOtherOpen(false);
      setDraft("");
      if (customValues.length) {
        onChange(selected.filter((id) => known.has(id)));
      }
    } else {
      setOtherOpen(true);
    }
  };

  const addDraft = () => {
    const v = draft.trim();
    if (!v) return;
    if (selectedSet.has(v) || known.has(v)) {
      setDraft("");
      return;
    }
    onChange([...selected, v]);
    setDraft("");
    setOtherOpen(true);
  };

  const removeCustom = (v: string) => onChange(selected.filter((x) => x !== v));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDraft();
    }
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selectedSet.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => togglePreset(opt.id)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary font-medium"
                  : "border-border bg-secondary/40 text-foreground hover:border-primary/40",
              )}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={toggleOther}
          className={cn(
            "rounded-full border px-3.5 py-2 text-sm transition-colors",
            otherActive
              ? "border-primary bg-primary/15 text-primary font-medium"
              : "border-border bg-secondary/40 text-foreground hover:border-primary/40",
          )}
        >
          อื่นๆ
        </button>
      </div>

      {customValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customValues.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {v}
              <button type="button" onClick={() => removeCustom(v)} className="hover:text-destructive" aria-label={`ลบ ${v}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {otherOpen && (
        <div className="flex items-center rounded-xl border border-border bg-secondary focus-within:ring-2 focus-within:ring-primary/30">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={otherPlaceholder}
            className="flex-1 bg-transparent px-4 py-2.5 text-sm focus:outline-none"
            autoFocus
          />
          <Button type="button" variant="ghost" size="sm" className="mr-1" onClick={addDraft}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
