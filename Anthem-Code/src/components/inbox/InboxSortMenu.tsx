import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { INBOX_SORT_OPTIONS, type InboxSortKey } from "@/lib/inboxSort";

type SortOption = { key: InboxSortKey; label: string };

type Props = {
  value: InboxSortKey;
  onChange: (key: InboxSortKey) => void;
  options?: SortOption[];
};

export function InboxSortMenu({ value, onChange, options = INBOX_SORT_OPTIONS }: Props) {
  const current = options.find((o) => o.key === value);
  const aria = current ? `เรียงรายการ: ${current.label}` : "เรียงรายการ";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={aria}
          title={aria}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowUpDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.key}
            onClick={() => onChange(option.key)}
            className="gap-2 text-xs"
          >
            <Check
              className={`h-3.5 w-3.5 ${value === option.key ? "opacity-100" : "opacity-0"}`}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
