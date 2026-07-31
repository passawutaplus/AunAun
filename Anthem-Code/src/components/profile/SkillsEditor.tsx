import { useMemo, useState, type KeyboardEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import ToolIcon from "@/components/ToolIcon";
import { SKILL_CHIP_SUGGESTIONS } from "@/data/skillChipOptions";
import { COMMON_TOOLS, hasCatalogToolIcon } from "@/lib/toolIcons";
import { normalizeToolKey } from "@/hooks/useToolSuggestions";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  /** When false, show freeform only (legacy). Default true. */
  withSuggestions?: boolean;
  max?: number;
}

const PRESET_POOL = Array.from(
  new Set<string>([...COMMON_TOOLS, ...SKILL_CHIP_SUGGESTIONS]),
);

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
  const showLogo = hasCatalogToolIcon(label);

  const content = (
    <>
      {showLogo ? <ToolIcon name={label} size="xs" /> : null}
      <span className="truncate max-w-[10rem]">{label}</span>
      {onRemove ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={`ลบ ${label}`}
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
  const [query, setQuery] = useState("");
  const selectedKeys = useMemo(() => new Set(value.map(normalizeToolKey)), [value]);

  const add = (raw: string) => {
    const label = raw.trim();
    if (!label || value.length >= max) return;
    const key = normalizeToolKey(label);
    if (!key || selectedKeys.has(key)) {
      setQuery("");
      return;
    }
    const preset = PRESET_POOL.find((p) => normalizeToolKey(p) === key);
    onChange([...value, preset ?? label]);
    setQuery("");
  };

  const remove = (skill: string) => onChange(value.filter((s) => s !== skill));

  const toggle = (skill: string) => {
    const key = normalizeToolKey(skill);
    if (selectedKeys.has(key)) {
      onChange(value.filter((s) => normalizeToolKey(s) !== key));
      return;
    }
    add(skill);
  };

  const filteredPresets = useMemo(() => {
    const q = normalizeToolKey(query);
    const pool = PRESET_POOL.filter((s) => !selectedKeys.has(normalizeToolKey(s)));
    if (!q) {
      const primary = SKILL_CHIP_SUGGESTIONS.filter((s) => !selectedKeys.has(normalizeToolKey(s)));
      const rest = COMMON_TOOLS.filter(
        (s) =>
          !selectedKeys.has(normalizeToolKey(s)) &&
          !primary.some((p) => normalizeToolKey(p) === normalizeToolKey(s)),
      ).slice(0, 12);
      return [...primary, ...rest];
    }
    return pool
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

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((s) => (
            <SkillChip key={s} label={s} selected onRemove={() => remove(s)} />
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
              ? "ค้นหาหรือพิมพ์เครื่องมือ / สไตล์ แล้วกด Enter"
              : "พิมพ์ทักษะแล้วกด Enter"
          }
          disabled={value.length >= max}
          className="flex-1 bg-transparent py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 focus:outline-none disabled:cursor-not-allowed"
          aria-label="ค้นหาความชำนาญ"
        />
        <button
          type="button"
          onClick={() => add(query)}
          disabled={!query.trim() || value.length >= max}
          className="text-primary disabled:opacity-40"
          aria-label="เพิ่มทักษะ"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {withSuggestions && filteredPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {query.trim() ? "ผลการค้นหา" : "เลือกจากรายการ"}
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
        !selectedKeys.has(normalizeToolKey(query)) && (
          <p className="text-xs text-muted-foreground">
            ไม่พบในรายการ — กด Enter เพื่อเพิ่ม “{query.trim()}”
          </p>
        )}
    </div>
  );
};

export default SkillsEditor;
