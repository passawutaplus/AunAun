import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type LucideIcon, Inbox } from "lucide-react";

/**
 * Reusable empty-state block for lists/feeds.
 * Uses semantic tokens — never raw colors.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}) {
  return (
    <Card className={`rounded-2xl border-dashed ${className ?? ""}`}>
      <CardContent className="py-12 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && (
          <Button
            size="sm"
            onClick={action.onClick}
            className="mt-2 rounded-full bg-gradient-primary text-primary-foreground gap-1.5"
          >
            {action.icon && <action.icon className="h-3.5 w-3.5" />}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
