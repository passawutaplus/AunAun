import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  INBOX_PRIORITIES,
  inboxPriorityDotClass,
  parseInboxPriority,
  type InboxPriority,
} from "@/lib/inboxPriority";
import { cn } from "@/lib/utils";

type Props = {
  value?: string | null;
  disabled?: boolean;
  onChange: (priority: InboxPriority) => void;
};

export function InboxPrioritySelect({ value, disabled, onChange }: Props) {
  const current = parseInboxPriority(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`ความสำคัญ ${current}`}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border/80 bg-muted/40 px-2 text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", inboxPriorityDotClass(current))} />
          <span className="truncate">{current}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {INBOX_PRIORITIES.map((priority) => (
          <DropdownMenuItem
            key={priority}
            onClick={() => onChange(priority)}
            className="gap-2 text-xs"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", inboxPriorityDotClass(priority))} />
            {priority}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
