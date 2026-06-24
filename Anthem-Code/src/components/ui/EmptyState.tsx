import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty state — ใช้แทนข้อความเดี่ยว ๆ */
export default function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "text-center py-12 md:py-16 px-6 glass-panel rounded-2xl flex flex-col items-center gap-3",
        className,
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <p className="text-lg font-medium text-foreground thai-display">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-md thai-body">{description}</p>}
      {action}
    </div>
  );
}
