import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type LabsToolToolbarItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
};

export function LabsToolToolbar({
  items,
  className,
}: {
  items: LabsToolToolbarItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/60 bg-muted/20",
        className,
      )}
      role="toolbar"
      aria-label="เครื่องมือ"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={item.variant ?? "secondary"}
            className="h-7 text-xs gap-1 px-2.5"
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            <span className="truncate max-w-[8rem] sm:max-w-none">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
