import { useMemo } from "react";
import { Palette, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ToolIcon from "@/components/ToolIcon";
import { useToolSuggestions, normalizeToolKey, isAudioTool } from "@/hooks/useToolSuggestions";
import { cn } from "@/lib/utils";

interface Props {
  userId?: string;
  tools: string[];
  onChange: (tools: string[]) => void;
  input: string;
  setInput: (v: string) => void;
  max?: number;
  variant?: "default" | "compact";
  showHeading?: boolean;
}

const SuggestionChip = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
  >
    <ToolIcon name={label} size="xs" />
    {label}
  </button>
);

const ToolPicker = ({
  userId,
  tools,
  onChange,
  input,
  setInput,
  max = 20,
  variant = "default",
  showHeading = false,
}: Props) => {
  const suggestions = useToolSuggestions(userId);
  const selectedKeys = useMemo(() => new Set(tools.map(normalizeToolKey)), [tools]);

  const addTool = (raw: string) => {
    const label = raw.trim();
    const key = normalizeToolKey(label);
    if (!key || selectedKeys.has(key) || tools.length >= max) return;
    onChange([...tools, label]);
    setInput("");
  };

  const filteredSuggestions = useMemo(() => {
    const q = normalizeToolKey(input);
    const pool = suggestions.filter((s) => {
      if (selectedKeys.has(normalizeToolKey(s))) return false;
      // ไม่โผล่ DAW ใน quick-pick จนกว่าจะพิมพ์ค้นหา
      if (!q && isAudioTool(s)) return false;
      return true;
    });
    if (!q) return pool.slice(0, 4);
    return pool
      .filter((s) => normalizeToolKey(s).includes(q) || q.includes(normalizeToolKey(s)))
      .slice(0, 12);
  }, [suggestions, input, selectedKeys]);

  const showQuick = !input.trim() && filteredSuggestions.length > 0;

  const toolChips =
    tools.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {tools.map((t, i) => (
          <Badge key={t + i} variant="secondary" className="rounded-full pl-1.5 pr-1 py-1 text-xs gap-1.5">
            <ToolIcon name={t} size="xs" />
            {t}
            <button
              type="button"
              onClick={() => onChange(tools.filter((_, j) => j !== i))}
              className="ml-0.5 hover:text-destructive"
              aria-label={`ลบ ${t}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    ) : null;

  const inputRow = (
    <div className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTool(input);
          }
        }}
        placeholder="พิมพ์เครื่องมือใหม่ หรือเลือกด้านล่าง"
        disabled={tools.length >= max}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={!input.trim() || tools.length >= max}
        onClick={() => addTool(input)}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        "space-y-3",
        variant === "default" && "rounded-2xl border border-border bg-card p-4",
      )}
    >
      {showHeading ? (
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Palette className="h-4 w-4 text-primary shrink-0" aria-hidden />
            เครื่องมือ & เทคโนโลยี
          </p>
          {inputRow}
        </div>
      ) : (
        <>
          {toolChips}
          {inputRow}
        </>
      )}

      {showHeading ? toolChips : null}

      {showQuick && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {filteredSuggestions.map((s) => (
            <SuggestionChip key={s} label={s} onClick={() => addTool(s)} />
          ))}
        </div>
      )}

      {input.trim() && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {filteredSuggestions.map((s) => (
            <SuggestionChip key={s} label={s} onClick={() => addTool(s)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolPicker;
