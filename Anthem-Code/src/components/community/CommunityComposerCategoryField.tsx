import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COMMUNITY_CATEGORIES } from "@/lib/classifyCommunityPost";
import type { ProjectCategory } from "@/data/projectTypes";
import { cn } from "@/lib/utils";

type Props = {
  suggested: ProjectCategory;
  /** null = follow auto suggestion */
  value: ProjectCategory | null;
  onChange: (value: ProjectCategory | null) => void;
  className?: string;
};

export function CommunityComposerCategoryField({
  suggested,
  value,
  onChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const display = value ?? suggested;
  const isAuto = value === null;

  return (
    <div className={cn("px-4 py-2 flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className="text-xs text-muted-foreground shrink-0">หมวด</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
          >
            {display}
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 max-h-64 overflow-y-auto" align="start">
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors",
                isAuto ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/70",
              )}
            >
              ใช้ที่ระบบแนะนำ
              <span className="block text-[11px] text-muted-foreground font-normal mt-0.5">{suggested}</span>
            </button>
            {COMMUNITY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onChange(cat);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-muted/70",
                  value === cat && "bg-primary/10 text-primary font-medium",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {isAuto ? (
        <span className="text-[11px] text-muted-foreground">แนะนำจากเนื้อหา เครื่องมือ และผลงานที่อ้างอิง</span>
      ) : null}
    </div>
  );
}
