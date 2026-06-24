import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuotationFormCard({
  title,
  description,
  icon,
  children,
  className,
  headerExtra,
  defaultOpen = true,
  open,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const expanded = isControlled ? open : internalOpen;

  function handleOpenChange(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Collapsible open={expanded} onOpenChange={handleOpenChange}>
      <section
        className={cn(
          "rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden",
          className,
        )}
      >
        <CollapsibleTrigger className="w-full px-5 py-4 border-b border-border/40 flex items-start justify-between gap-3 text-left hover:bg-muted/20 transition-colors">
          <div className="min-w-0 flex items-start gap-2">
            <ChevronDown
              className={cn(
                "h-4 w-4 text-primary shrink-0 mt-0.5 transition-transform",
                expanded && "rotate-180",
              )}
            />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                {icon && <span className="text-primary shrink-0">{icon}</span>}
                {title}
              </h2>
              {description && (
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">{headerExtra}</div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-5 space-y-4">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

interface BlockProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function QuotationCollapsibleBlock({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
  className,
}: BlockProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <CollapsibleTrigger className="w-full px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-2 text-left">
          <h3 className="text-xs font-semibold flex items-center gap-1.5 text-foreground min-w-0 flex-1">
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
                open && "rotate-180",
              )}
            />
            {icon && <span className="text-primary shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </h3>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 py-3 space-y-2">
            {description && (
              <p className="text-[10px] text-muted-foreground -mt-1 mb-1">{description}</p>
            )}
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
