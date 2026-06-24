import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import ToolIcon from "@/components/ToolIcon";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COMMON_TOOLS, sortToolsVisualFirst } from "@/lib/toolIcons";
import { normalizeToolName } from "@/lib/exploreRoutes";
import { cn } from "@/lib/utils";

const MAX_EXTRA_TOOLS = 4;

interface Props {
  primaryTool: string;
  extraTools: string[];
  onAddTool: (tool: string) => void;
  onRemoveTool: (tool: string) => void;
}

const ExploreToolFilterBar = ({ primaryTool, extraTools, onAddTool, onRemoveTool }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    keys.add(normalizeToolName(primaryTool));
    extraTools.forEach((t) => keys.add(normalizeToolName(t)));
    return keys;
  }, [primaryTool, extraTools]);

  const suggestions = useMemo(() => {
    const q = normalizeToolName(query);
    const pool = sortToolsVisualFirst([...COMMON_TOOLS]).filter((t) => !selectedKeys.has(normalizeToolName(t)));
    if (!q) return pool.slice(0, 14);
    return pool
      .filter((t) => normalizeToolName(t).includes(q) || q.includes(normalizeToolName(t)))
      .slice(0, 14);
  }, [query, selectedKeys]);

  const canAddMore = extraTools.length < MAX_EXTRA_TOOLS;

  const pickTool = (tool: string) => {
    onAddTool(tool);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
      <ToolFilterChip tool={primaryTool} primary />

      {extraTools.map((tool) => (
        <ToolFilterChip key={tool} tool={tool} onRemove={() => onRemoveTool(tool)} />
      ))}

      {canAddMore && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="เพิ่มเครื่องมือ"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">เพิ่มเครื่องมือ</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              แสดงเฉพาะผลงานที่ใช้ครบทุกเครื่องมือที่เลือก
            </p>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา เช่น Premiere"
              className="h-8 text-xs"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
              {suggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">ไม่พบเครื่องมือ</p>
              ) : (
                suggestions.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => pickTool(tool)}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border/80 bg-muted/40 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors"
                  >
                    <ToolIcon name={tool} size="xs" />
                    {tool}
                  </button>
                ))
              )}
            </div>
            {query.trim() &&
              !suggestions.some((t) => normalizeToolName(t) === normalizeToolName(query)) &&
              !selectedKeys.has(normalizeToolName(query)) && (
                <button
                  type="button"
                  onClick={() => pickTool(query.trim())}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  เพิ่ม &quot;{query.trim()}&quot;
                </button>
              )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

function ToolFilterChip({
  tool,
  primary,
  onRemove,
}: {
  tool: string;
  primary?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full border text-xs shrink-0",
        primary
          ? "border-primary/25 bg-primary/5 text-foreground font-medium"
          : "border-border bg-background text-foreground",
      )}
    >
      <ToolIcon name={tool} size="xs" />
      <span className="max-w-[7rem] sm:max-w-[9rem] truncate">{tool}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`เอา ${tool} ออก`}
          className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      ) : null}
    </span>
  );
}

export default ExploreToolFilterBar;
