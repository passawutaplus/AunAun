import { Link } from "react-router-dom";
import {
  ChevronDown,
  HelpCircle,
  Instagram,
  MessagesSquare,
  UsersRound,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FORUM_PATH } from "@/lib/brandConfig";
import { cn } from "@/lib/utils";

type CommunityItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
  external?: string;
};

const COMMUNITY_ITEMS: CommunityItem[] = [
  {
    id: "facebook-group",
    title: "Facebook Group",
    description: "คุยกับครีเอเตอร์และอัปเดตชุมชน",
    icon: UsersRound,
  },
  {
    id: "forum",
    title: "Forum",
    description: "ถามตอบ แจ้งบั๊ก และแชร์ไอเดีย",
    icon: MessagesSquare,
    to: FORUM_PATH,
  },
  {
    id: "help-center",
    title: "Help Center",
    description: "มีคำถาม — หาคำตอบและวิธีใช้",
    icon: HelpCircle,
    to: "/help",
  },
];

/** Placeholder social marks — UI only, not linked yet. */
function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.99 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function TikTokMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.96 4.96 0 0 1 19.2 5.1V8.3a7.9 7.9 0 0 1-2.6.44v6.2a5.96 5.96 0 1 1-5.96-5.96c.2 0 .4.01.6.04v3.13a2.86 2.86 0 1 0 2.3 2.8V2.5h3.06c.2 1.2.8 2.3 1.66 3.32z" />
    </svg>
  );
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.37 1.4-3.68 3.56-3.68 1.03 0 2.11.18 2.11.18v2.33h-1.19c-1.17 0-1.54.73-1.54 1.48v1.78h2.62l-.42 2.91h-2.2V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  );
}

const SOCIAL_PLACEHOLDERS = [
  { id: "instagram", label: "Instagram", Icon: Instagram },
  { id: "x", label: "X", Icon: XMark },
  { id: "facebook", label: "Facebook", Icon: FacebookMark },
  { id: "youtube", label: "YouTube", Icon: Youtube },
  { id: "tiktok", label: "TikTok", Icon: TikTokMark },
] as const;

const itemClass =
  "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/70";

export function CommunityNavDropdown({ className }: { className?: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            className,
          )}
        >
          Community
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="w-[22rem] rounded-2xl border border-border/70 bg-background p-2 shadow-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-0.5 p-1">
          {COMMUNITY_ITEMS.map((item) => {
            const Icon = item.icon;
            const body = (
              <>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </>
            );

            if (item.to) {
              return (
                <Link key={item.id} to={item.to} className={itemClass}>
                  {body}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                disabled
                title="เร็ว ๆ นี้"
                className={cn(itemClass, "cursor-not-allowed opacity-60")}
              >
                {body}
              </button>
            );
          })}
        </div>

        <div className="mx-2 my-1 border-t border-border/70" />

        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Follow Us</span>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {SOCIAL_PLACEHOLDERS.map(({ id, label, Icon }) => (
              <Button
                key={id}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={label}
                title={`${label} — เร็ว ๆ นี้`}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.preventDefault()}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
