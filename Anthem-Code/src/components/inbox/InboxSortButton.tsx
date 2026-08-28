import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  INBOX_SORT_OPTIONS,
  type InboxSortKey,
} from "@/lib/inboxListSort";

type Props = {
  value: InboxSortKey | null;
  onChange: (key: InboxSortKey) => void;
};

export function InboxSortButton({ value, onChange }: Props) {
  const current = INBOX_SORT_OPTIONS.find((o) => o.key === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary"
          aria-label="เรียงรายการ"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {current ? current.label.replace(/^เรียงตาม/, "เรียงตาม") : "เรียงตาม.."}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {INBOX_SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.key}
            className="gap-2 text-xs"
            onClick={() => onChange(opt.key)}
          >
            <span className="flex-1">{opt.label}</span>
            {value === opt.key ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
