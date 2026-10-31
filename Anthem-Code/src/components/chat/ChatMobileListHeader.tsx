import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { CHAT_FILTER_TABS } from "@/components/chat/ChatFilterRail";
import type { ChatKind } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

type Props = {
  tab: "all" | ChatKind;
  onTabChange: (tab: "all" | ChatKind) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onTour?: () => void;
  onCreateGroup?: () => void;
};

const ICON_BTN =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Phone chat list: one row — back, title, type filter, search icon (expands to a field), tour. */
export function ChatMobileListHeader({ tab, onTabChange, search, onSearchChange, onTour, onCreateGroup }: Props) {
  const [searching, setSearching] = useState(() => search.trim().length > 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = CHAT_FILTER_TABS.find((t) => t.key === tab) ?? CHAT_FILTER_TABS[0];

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  if (searching) {
    return (
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 md:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อหรืองาน…"
            aria-label="ค้นหาแชท"
            className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          aria-label="ปิดการค้นหา"
          className={ICON_BTN}
          onClick={() => {
            onSearchChange("");
            setSearching(false);
          }}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>
    );
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-card px-3 md:hidden">
      <BackButton label="กลับหน้าก่อนหน้า" />
      <h1 className="ml-1 text-2xl font-semibold tracking-tight text-foreground">Chat</h1>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`ประเภทบทสนทนา: ${active.label}`}
            className="ml-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {active.icon ? <active.icon className="h-3.5 w-3.5" aria-hidden /> : null}
            {active.label}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44 rounded-xl">
          {CHAT_FILTER_TABS.map(({ key, label, icon: Icon }) => (
            <DropdownMenuItem key={key} onClick={() => onTabChange(key)} className="gap-2 rounded-lg">
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : <span className="h-4 w-4" aria-hidden />}
              <span className="flex-1">{label}</span>
              <Check className={cn("h-4 w-4", key === tab ? "opacity-100" : "opacity-0")} aria-hidden />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="ml-auto flex items-center gap-0.5">
        <button type="button" aria-label="ค้นหาแชท" className={ICON_BTN} onClick={() => setSearching(true)}>
          <Search className="h-5 w-5" aria-hidden />
        </button>
        {onCreateGroup ? (
          <button type="button" aria-label="สร้างกลุ่มแชท" className={ICON_BTN} onClick={onCreateGroup}>
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        {onTour ? <TourHelpButton onClick={onTour} className="h-9 w-9" /> : null}
      </div>
    </header>
  );
}
