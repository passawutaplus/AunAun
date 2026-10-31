import { useMemo, useState, type KeyboardEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import { SKILL_CHIP_CATALOG, SKILL_CHIP_SUGGESTIONS_EN, canonicalizeSkillChip, isCatalogSkillSelected } from "@/data/skillChipOptions";
import { normalizeToolKey } from "@/hooks/useToolSuggestions";
import { cn } from "@/lib/utils";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  /** When false, show freeform only (languages). Default true. */
  withSuggestions?: boolean;
  max?: number;
}

function SkillChip({
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
      <span className="truncate max-w-[10rem]">{label}</span>
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

const SkillsEditor = ({ value, onChange, withSuggestions = true, max = 30 }: Props) => {
  const { t } = useAboutEditLocale();
  const [query, setQuery] = useState("");

  const add = (raw: string) => {
    const label = raw.trim();
    if (!label || value.length >= max) return;
    if (isCatalogSkillSelected(value, label)) {
      setQuery("");
      return;
    }
    onChange([...value, canonicalizeSkillChip(label)]);
    setQuery("");
  };

  const remove = (skill: string) => onChange(value.filter((s) => s !== skill));

  const toggle = (skill: string) => {
    if (isCatalogSkillSelected(value, skill)) {
      const want = canonicalizeSkillChip(skill).toLowerCase();
      onChange(value.filter((s) => canonicalizeSkillChip(s).toLowerCase() !== want));
      return;
    }
    add(skill);
  };

  const filteredPresets = useMemo(() => {
    const q = normalizeToolKey(query);
    const pool = SKILL_CHIP_SUGGESTIONS_EN.filter((s) => !isCatalogSkillSelected(value, s));
    if (!q) return pool;
    return pool
      .filter((s) => {
        const th = SKILL_CHIP_CATALOG.find((item) => item.en === s)?.th ?? "";
        const hay = normalizeToolKey(`${s} ${th}`);
        return hay.includes(q) || q.includes(normalizeToolKey(s));
      })
      .slice(0, 24);
  }, [query, value]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(query);
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]!);
    }
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((s) => (
            <SkillChip key={s} label={canonicalizeSkillChip(s)} selected onRemove={() => remove(s)} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40 px-3">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={
            withSuggestions
              ? t.skillsSearch
              : t.skillsSearch
          }
          disabled={value.length >= max}
          className="flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          aria-label={t.skillsSearchAria}
        />
        <button
          type="button"
          onClick={() => add(query)}
          disabled={!query.trim() || value.length >= max}
          className="text-primary disabled:opacity-40"
          aria-label={t.add}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {withSuggestions && filteredPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {query.trim() ? t.searchResults : t.pickList}
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredPresets.map((s) => (
              <SkillChip key={s} label={s} onClick={() => toggle(s)} />
            ))}
          </div>
        </div>
      )}

      {withSuggestions &&
        query.trim() &&
        filteredPresets.length === 0 &&
        !isCatalogSkillSelected(value, query) && (
          <p className="text-xs text-muted-foreground">
            {t.notInList(query.trim())}
          </p>
        )}
    </div>
  );
};

export default SkillsEditor;
