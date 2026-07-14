import { useState } from "react";
import { Check, ListFilter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import {
  FORUM_LIST_FILTERS,
  type ForumListFilter,
} from "@/lib/forum";
import { cn } from "@/lib/utils";

type Props = {
  value: ForumListFilter | null;
  onChange: (next: ForumListFilter | null) => void;
  className?: string;
};

export function ForumTopicFilter({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);

  const pick = (id: ForumListFilter) => {
    const meta = FORUM_LIST_FILTERS.find((f) => f.id === id);
    if (meta?.needsAuth && !user) {
      setOpen(false);
      openSignup();
      return;
    }
    onChange(value === id ? null : id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="กรองกระทู้"
          aria-expanded={open}
          aria-pressed={!!value}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            value
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            className,
          )}
        >
          <ListFilter className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1.5">
        <ul className="space-y-0.5" role="listbox" aria-label="ตัวกรองกระทู้">
          {FORUM_LIST_FILTERS.map((opt) => {
            const active = value === opt.id;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span className="flex-1">{opt.label}</span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
