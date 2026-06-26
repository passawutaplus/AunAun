import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTagSuggestions } from "@/hooks/useTagSuggestions";
import { normalizeTag } from "@/lib/exploreRoutes";
import { cn } from "@/lib/utils";

interface Props {
  userId?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  input: string;
  setInput: (v: string) => void;
  max?: number;
  variant?: "default" | "compact";
  presets?: readonly string[];
}

const TagPicker = ({
  userId,
  tags,
  onChange,
  input,
  setInput,
  max = 15,
  variant = "default",
  presets = [],
}: Props) => {
  const suggestions = useTagSuggestions(userId);
  const selectedKeys = useMemo(() => new Set(tags.map(normalizeTag)), [tags]);

  const addTag = (raw: string) => {
    const label = raw.trim().replace(/^#+/, "");
    const key = normalizeTag(label);
    if (!key || selectedKeys.has(key) || tags.length >= max) return;
    onChange([...tags, label]);
    setInput("");
  };

  const availablePresets = useMemo(
    () => presets.filter((p) => !selectedKeys.has(normalizeTag(p))),
    [presets, selectedKeys],
  );

  const filteredSuggestions = useMemo(() => {
    const q = normalizeTag(input);
    const pool = suggestions.filter((s) => !selectedKeys.has(normalizeTag(s)));
    if (!q) return pool.slice(0, 12);
    return pool
      .filter((s) => normalizeTag(s).includes(q) || q.includes(normalizeTag(s)))
      .slice(0, 12);
  }, [suggestions, input, selectedKeys]);

  const showQuick = !input.trim() && (availablePresets.length > 0 || filteredSuggestions.length > 0);

  return (
    <div
      className={cn(
        "space-y-3",
        variant === "default" && "rounded-2xl border border-border bg-card p-4",
      )}
    >
      {variant === "default" && (
        <Label className="text-xs font-semibold text-muted-foreground uppercase">แท็ก</Label>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <Badge key={t + i} variant="secondary" className="rounded-full pl-3 pr-1 py-1 text-xs">
              #{t}
              <button
                type="button"
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="ml-1 hover:text-destructive"
                aria-label={`ลบแท็ก ${t}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder="พิมพ์แท็กใหม่ หรือเลือกด้านล่าง"
          disabled={tags.length >= max}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={!input.trim() || tags.length >= max}
          onClick={() => addTag(input)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {showQuick && (
        <div className="space-y-2">
          {availablePresets.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">แนะนำ</p>
              <div className="flex flex-wrap gap-1.5">
                {availablePresets.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTag(s)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5",
                      "text-primary hover:bg-primary/10 transition-colors",
                    )}
                  >
                    #{s}
                  </button>
                ))}
              </div>
            </>
          )}
          {filteredSuggestions.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {availablePresets.length > 0 ? "แท็กที่ใช้บ่อย" : "แท็กที่ใช้บ่อย"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTag(s)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border border-border/80 bg-muted/40",
                      "text-foreground/80 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors",
                    )}
                  >
                    #{s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {input.trim() && filteredSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">แนะนำ</p>
          <div className="flex flex-wrap gap-1.5">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
              >
                #{s}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        {tags.length}/{max} แท็ก — กด Enter เพื่อเพิ่มแท็กใหม่
      </p>
    </div>
  );
};

export default TagPicker;
