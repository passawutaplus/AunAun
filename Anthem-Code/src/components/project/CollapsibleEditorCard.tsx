import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  icon: LucideIcon;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleEditorCard({ title, icon: Icon, hint, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            aria-expanded={open}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {title}
            </span>
            {!open && hint ? (
              <span className="ml-auto truncate text-xs font-normal normal-case text-muted-foreground">{hint}</span>
            ) : (
              <span className="ml-auto" />
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 px-4 pb-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
