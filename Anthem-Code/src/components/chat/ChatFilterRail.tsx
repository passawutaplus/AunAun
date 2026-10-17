import { Handshake, Users, type LucideIcon } from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import type { ChatKind } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

const TABS: {
  key: "all" | ChatKind;
  label: string;
  icon?: LucideIcon;
}[] = [
  { key: "all", label: "ALL" },
  { key: "hire", label: "งานจ้าง", icon: BriefcaseIcon },
  { key: "collab", label: "คอลแลป", icon: Handshake },
  { key: "group", label: "กลุ่ม", icon: Users },
];

type Props = {
  tab: "all" | ChatKind;
  onTabChange: (tab: "all" | ChatKind) => void;
  className?: string;
};

/** Conversation filters as a chip row under the chat search box. */
export function ChatFilterRail({ tab, onTabChange, className }: Props) {
  return (
    <div
      role="group"
      aria-label="ประเภทบทสนทนา"
      className={cn("flex items-center gap-1.5 overflow-x-auto scrollbar-hide", className)}
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = tab === key;
        const accent =
          key === "hire"
            ? active
              ? "bg-[hsl(var(--chat-hire))] text-[hsl(var(--chat-hire-foreground))]"
              : "bg-muted/70 text-muted-foreground hover:text-foreground"
            : key === "collab"
              ? active
                ? "bg-[hsl(var(--chat-collab))] text-[hsl(var(--chat-collab-foreground))]"
                : "bg-muted/70 text-muted-foreground hover:text-foreground"
              : key === "group"
                ? active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground"
                : active
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground";
        return (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              accent,
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
            {label}
          </button>
        );
      })}
    </div>
  );
}
