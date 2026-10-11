import { Handshake, Users, type LucideIcon } from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import { BackButton } from "@/components/ui/BackButton";
import type { ChatKind } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

const TABS: {
  key: "all" | ChatKind;
  label: string;
  icon?: LucideIcon;
}[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "hire", label: "งานจ้าง", icon: BriefcaseIcon },
  { key: "collab", label: "คอลแลป", icon: Handshake },
  { key: "group", label: "กลุ่ม", icon: Users },
];

type Props = {
  tab: "all" | ChatKind;
  onTabChange: (tab: "all" | ChatKind) => void;
  className?: string;
};

/** Far-left chat column: back to the previous page, then conversation filters. */
export function ChatFilterRail({ tab, onTabChange, className }: Props) {
  return (
    <nav
      aria-label="ตัวกรองแชท"
      className={cn(
        "flex h-full w-[5.5rem] shrink-0 flex-col items-center gap-2 border-r border-border bg-card px-1.5 py-3",
        className,
      )}
    >
      <BackButton label="กลับหน้าก่อนหน้า" />
      <div className="my-1 h-px w-8 bg-border" aria-hidden />
      <div className="flex w-full flex-col items-center gap-2" role="group" aria-label="ประเภทบทสนทนา">
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
              aria-label={label}
              aria-pressed={active}
              title={label}
              className={cn(
                "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                Icon ? "h-9 w-9" : "h-8 w-full whitespace-nowrap px-1 text-[11px] font-medium",
                accent,
              )}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
