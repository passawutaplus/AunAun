import { useMemo, useState, type KeyboardEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import ToolIcon from "@/components/ToolIcon";
import { CATALOG_TOOL_LABELS, COMMON_TOOLS } from "@/lib/toolIcons";
import { isAudioTool, normalizeToolKey } from "@/hooks/useToolSuggestions";
import { cn } from "@/lib/utils";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
};

function findCatalogLabel(raw: string): string | undefined {
  const key = normalizeToolKey(raw);
  if (!key) return undefined;
  return CATALOG_TOOL_LABELS.find((label) => normalizeToolKey(label) === key);
}

function SoftwareChip({
  label,
  selected,
  onClick,
  onRemove,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const { t } = useAboutEditLocale();
  const content = (
    <>
      <ToolIcon name={label} size="xs" />
      <span className="truncate max-w-[9rem]">{label}</span>
      {onRemove ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={`${t.remove} ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive"
        >
          <X className="w-3 h-3" />
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
    selected
      ? "border-primary/50 bg-primary/10 text-primary"
      : "border-border bg-secondary text-foreground hover:border-primary/40 hover:text-primary",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-pressed={!!selected}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}

export default function CvToolsEditor({ value, onChange, max = 12 }: Props) {
  const { t } = useAboutEditLocale();
  const [query, setQuery] = useState("");
  const selectedKeys = useMemo(() => new Set(value.map(normalizeToolKey)), [value]);

  const add = (raw: string) => {
    const preset = findCatalogLabel(raw);
    if (!preset || value.length >= max) {
      return;
    }
    if (selectedKeys.has(normalizeToolKey(preset))) {
      setQuery("");
      return;
    }
    onChange([...value, preset]);
    setQuery("");
  };

  const remove = (label: string) => onChange(value.filter((s) => s !== label));

  const toggle = (label: string) => {
    const key = normalizeToolKey(label);
    if (selectedKeys.has(key)) {
      onChange(value.filter((s) => normalizeToolKey(s) !== key));
      return;
    }
    add(label);
  };

  const filteredCatalog = useMemo(() => {
    const q = normalizeToolKey(query);
    const unused = CATALOG_TOOL_LABELS.filter((s) => !selectedKeys.has(normalizeToolKey(s)));
    if (!q) {
      return COMMON_TOOLS.filter((s) => !selectedKeys.has(normalizeToolKey(s)) && !isAudioTool(s));
    }
    return unused
      .filter((s) => normalizeToolKey(s).includes(q) || q.includes(normalizeToolKey(s)))
      .slice(0, 24);
  }, [query, selectedKeys]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(query);
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]!);
    }
  };

  const unmatchedQuery = query.trim() && !findCatalogLabel(query) && filteredCatalog.length === 0;

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((s) => (
            <SoftwareChip key={s} label={s} selected onRemove={() => remove(s)} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40 px-3">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={t.softwareSearch}
          disabled={value.length >= max}
          className="flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 focus:outline-none disabled:cursor-not-allowed"
          aria-label={t.softwareSearchAria}
        />
        <button
          type="button"
          onClick={() => add(query)}
          disabled={!findCatalogLabel(query) || value.length >= max}
          className="text-primary disabled:opacity-40"
          aria-label={t.add}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {filteredCatalog.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {query.trim() ? t.searchResults : t.pickCatalog}
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredCatalog.map((s) => (
              <SoftwareChip key={s} label={s} onClick={() => toggle(s)} />
            ))}
          </div>
        </div>
      )}

      {unmatchedQuery ? (
        <p className="text-xs text-muted-foreground">{t.notInCatalog}</p>
      ) : null}
    </div>
  );
}
