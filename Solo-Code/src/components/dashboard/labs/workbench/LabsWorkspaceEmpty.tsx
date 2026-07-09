import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LabsWorkspaceEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}) {
  const ActionIcon = action?.icon;
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center",
        className,
      )}
    >
      <div className="mx-auto h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button size="sm" className="mt-4 h-8 text-xs gap-1.5" onClick={action.onClick}>
          {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
